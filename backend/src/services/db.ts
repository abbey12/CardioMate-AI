import { query, getClient } from "../db/connection.js";
import type { Admin, Facility } from "../types/auth.js";
import type { EcgStructuredReport } from "../types/ecg.js";
import type { Patient, CreatePatientData, UpdatePatientData, PatientWithStats } from "../types/patient.js";

// ==================== Admin Queries ====================

export async function createAdmin(
  email: string,
  passwordHash: string,
  name?: string
): Promise<Admin> {
  const result = await query<Admin>(
    `INSERT INTO admins (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, password_hash as "passwordHash", created_at as "createdAt"`,
    [email, passwordHash, name || null]
  );
  return result.rows[0];
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const result = await query<Admin>(
    `SELECT id, email, name, password_hash as "passwordHash", created_at as "createdAt"
     FROM admins
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const result = await query<Admin>(
    `SELECT id, email, name, password_hash as "passwordHash", created_at as "createdAt"
     FROM admins
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ==================== Facility Queries ====================

// Generate unique referral code
function generateReferralCode(): string {
  // Generate a 8-character alphanumeric code (uppercase)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createFacility(
  name: string,
  email: string,
  passwordHash: string,
  referralCode?: string | null,
  country?: string | null
): Promise<Facility> {
  const client = await getClient();
  
  try {
    await client.query("BEGIN");
    
    // Generate unique referral code
    let newReferralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await client.query(
        `SELECT id FROM facilities WHERE referral_code = $1`,
        [newReferralCode]
      );
      if (existing.rows.length === 0) break;
      newReferralCode = generateReferralCode();
      attempts++;
    }
    
    // Check if referral code is provided and valid
    let referredByFacilityId: string | null = null;
    if (referralCode) {
      const referringFacility = await client.query<{ id: string }>(
        `SELECT id FROM facilities WHERE referral_code = $1`,
        [referralCode]
      );
      if (referringFacility.rows.length > 0) {
        referredByFacilityId = referringFacility.rows[0].id;
      }
    }
    
    // Create facility (with fallback if extra columns don't exist)
    let result;
    try {
      result = await client.query<Facility>(
        `INSERT INTO facilities (name, email, password_hash, referral_code, referred_by_facility_id, country)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, password_hash as "passwordHash", referral_code as "referralCode", 
                   referred_by_facility_id as "referredByFacilityId", created_at as "createdAt", updated_at as "updatedAt"`,
        [name, email, passwordHash, newReferralCode, referredByFacilityId, country ?? null]
      );
    } catch (error: any) {
      // Fallback if referral columns don't exist yet
      if (
        error?.message?.includes("referral_code") ||
        error?.message?.includes("referred_by_facility_id") ||
        error?.message?.includes("country")
      ) {
        result = await client.query<Facility>(
          `INSERT INTO facilities (name, email, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`,
          [name, email, passwordHash]
        );
        // Add referral fields manually
        result.rows[0] = { ...result.rows[0], referralCode: null, referredByFacilityId: null };
      } else {
        throw error;
      }
    }
    
    const facility = result.rows[0];
    
    // Initialize wallet
    await client.query(
      `INSERT INTO facility_wallets (facility_id, balance, currency)
       VALUES ($1, 0.00, 'GHS')
       ON CONFLICT (facility_id) DO NOTHING`,
      [facility.id]
    );
    
    // Get platform settings for bonuses (with fallback if table doesn't exist)
    let signupBonus = { amount: 50.00, enabled: true };
    let referralBonus = { amount: 25.00, enabled: true };
    
    try {
      const signupBonusSetting = await client.query<{ setting_value: any }>(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'signup_bonus_amount'`
      );
      if (signupBonusSetting.rows[0]?.setting_value) {
        signupBonus = signupBonusSetting.rows[0].setting_value;
      }
    } catch (e: any) {
      // Table doesn't exist yet - use defaults
    }
    
    try {
      const referralBonusSetting = await client.query<{ setting_value: any }>(
        `SELECT setting_value FROM platform_settings WHERE setting_key = 'referral_bonus_amount'`
      );
      if (referralBonusSetting.rows[0]?.setting_value) {
        referralBonus = referralBonusSetting.rows[0].setting_value;
      }
    } catch (e: any) {
      // Table doesn't exist yet - use defaults
    }
    
    // Credit signup bonus if enabled
    if (signupBonus.enabled && signupBonus.amount > 0) {
      const bonusAmount = parseFloat(signupBonus.amount.toString());
      await client.query(
        `UPDATE facility_wallets SET balance = balance + $1 WHERE facility_id = $2`,
        [bonusAmount, facility.id]
      );
      
      await client.query(
        `INSERT INTO wallet_transactions (
          facility_id, type, amount, balance_before, balance_after,
          description, status, metadata
        ) VALUES ($1, 'bonus', $2, 0.00, $2, $3, 'completed', $4)`,
        [
          facility.id,
          bonusAmount,
          `Signup bonus for new facility`,
          JSON.stringify({ type: 'signup_bonus', facilityId: facility.id })
        ]
      );
    }
    
    // Credit referral bonus to referring facility if applicable
    if (referredByFacilityId && referralBonus.enabled && referralBonus.amount > 0) {
      const bonusAmount = parseFloat(referralBonus.amount.toString());
      
      // Get referring facility's wallet balance
      const referringWallet = await client.query<{ balance: number }>(
        `SELECT balance FROM facility_wallets WHERE facility_id = $1 FOR UPDATE`,
        [referredByFacilityId]
      );
      
      if (referringWallet.rows.length > 0) {
        const balanceBefore = parseFloat(referringWallet.rows[0].balance.toString());
        const balanceAfter = balanceBefore + bonusAmount;
        
        await client.query(
          `UPDATE facility_wallets SET balance = balance + $1 WHERE facility_id = $2`,
          [bonusAmount, referredByFacilityId]
        );
        
        await client.query(
          `INSERT INTO wallet_transactions (
            facility_id, type, amount, balance_before, balance_after,
            description, status, metadata
          ) VALUES ($1, 'bonus', $2, $3, $4, $5, 'completed', $6)`,
          [
            referredByFacilityId,
            bonusAmount,
            balanceBefore,
            balanceAfter,
            `Referral bonus for referring facility: ${name}`,
            JSON.stringify({ type: 'referral_bonus', referredFacilityId: facility.id })
          ]
        );
        
        // Create referral record (with fallback if table doesn't exist)
        try {
          await client.query(
            `INSERT INTO referrals (
              referring_facility_id, referred_facility_id, referral_bonus_amount, signup_bonus_amount, status
            ) VALUES ($1, $2, $3, $4, 'completed')`,
            [
              referredByFacilityId,
              facility.id,
              bonusAmount,
              signupBonus.enabled ? parseFloat(signupBonus.amount.toString()) : 0
            ]
          );
        } catch (e: any) {
          // Table doesn't exist yet - skip referral record creation
          console.warn("Referrals table doesn't exist yet. Run migration to enable referral tracking.");
        }
      }
    }
    
    await client.query("COMMIT");
    client.release();
    
    return facility;
  } catch (error: any) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
}

export async function getFacilityByEmail(email: string): Promise<Facility | null> {
  try {
    const result = await query<Facility>(
      `SELECT id, name, email, password_hash as "passwordHash", 
              COALESCE(referral_code, NULL) as "referralCode", 
              COALESCE(referred_by_facility_id, NULL) as "referredByFacilityId", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM facilities
       WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    // Fallback if referral columns don't exist yet (migration not run)
    if (error?.message?.includes("referral_code") || error?.message?.includes("referred_by_facility_id")) {
      const result = await query<Facility>(
        `SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
         FROM facilities
         WHERE email = $1`,
        [email]
      );
      const facility = result.rows[0];
      if (facility) {
        return { ...facility, referralCode: null, referredByFacilityId: null };
      }
      return null;
    }
    throw error;
  }
}

export async function getFacilityById(id: string): Promise<Facility | null> {
  try {
    const result = await query<Facility>(
      `SELECT id, name, email, password_hash as "passwordHash",
              phone,
              address_line1 as "addressLine1",
              address_line2 as "addressLine2",
              city,
              country,
              facility_type as "facilityType",
              contact_name as "contactName",
              contact_phone as "contactPhone",
              website,
              signup_completed_at as "signupCompletedAt",
              COALESCE(referral_code, NULL) as "referralCode", 
              COALESCE(referred_by_facility_id, NULL) as "referredByFacilityId",
              COALESCE(preferred_language, NULL) as "preferredLanguage",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM facilities
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    // Fallback if columns don't exist yet (migration not run)
    if (
      error?.message?.includes("referral_code") ||
      error?.message?.includes("referred_by_facility_id") ||
      error?.message?.includes("phone") ||
      error?.message?.includes("address_line1") ||
      error?.message?.includes("facility_type") ||
      error?.message?.includes("preferred_language") ||
      error?.message?.includes("contact_name") ||
      error?.message?.includes("signup_completed_at")
    ) {
      const result = await query<Facility>(
        `SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
         FROM facilities
         WHERE id = $1`,
        [id]
      );
      const facility = result.rows[0];
      if (facility) {
        return {
          ...facility,
          referralCode: null,
          referredByFacilityId: null,
          phone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          country: null,
          facilityType: null,
          contactName: null,
          contactPhone: null,
          website: null,
          signupCompletedAt: null,
        };
      }
      return null;
    }
    throw error;
  }
}

export async function getAllFacilities(): Promise<Facility[]> {
  try {
    const result = await query<Facility>(
      `SELECT id, name, email, password_hash as "passwordHash",
              phone,
              address_line1 as "addressLine1",
              address_line2 as "addressLine2",
              city,
              country,
              facility_type as "facilityType",
              contact_name as "contactName",
              contact_phone as "contactPhone",
              website,
              signup_completed_at as "signupCompletedAt",
              COALESCE(referral_code, NULL) as "referralCode", 
              COALESCE(referred_by_facility_id, NULL) as "referredByFacilityId", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM facilities
       ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (error: any) {
    // Fallback if columns don't exist yet (migration not run)
    if (
      error?.message?.includes("referral_code") ||
      error?.message?.includes("referred_by_facility_id") ||
      error?.message?.includes("phone") ||
      error?.message?.includes("address_line1") ||
      error?.message?.includes("facility_type") ||
      error?.message?.includes("contact_name") ||
      error?.message?.includes("signup_completed_at")
    ) {
      const result = await query<Facility>(
        `SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
         FROM facilities
         ORDER BY created_at DESC`
      );
      return result.rows.map((f) => ({
        ...f,
        referralCode: null,
        referredByFacilityId: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        country: null,
        facilityType: null,
        contactName: null,
        contactPhone: null,
        website: null,
        signupCompletedAt: null,
      }));
    }
    throw error;
  }
}

export async function deleteFacility(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM facilities WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateFacility(
  id: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    facilityType?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    website?: string | null;
    signupCompletedAt?: Date | null;
    preferredLanguage?: string | null;
  }
): Promise<Facility | null> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    updatesList.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    updatesList.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  if (updates.addressLine1 !== undefined) {
    updatesList.push(`address_line1 = $${paramIndex++}`);
    values.push(updates.addressLine1);
  }
  if (updates.addressLine2 !== undefined) {
    updatesList.push(`address_line2 = $${paramIndex++}`);
    values.push(updates.addressLine2);
  }
  if (updates.city !== undefined) {
    updatesList.push(`city = $${paramIndex++}`);
    values.push(updates.city);
  }
  if (updates.country !== undefined) {
    updatesList.push(`country = $${paramIndex++}`);
    values.push(updates.country);
  }
  if (updates.facilityType !== undefined) {
    updatesList.push(`facility_type = $${paramIndex++}`);
    values.push(updates.facilityType);
  }
  if (updates.contactName !== undefined) {
    updatesList.push(`contact_name = $${paramIndex++}`);
    values.push(updates.contactName);
  }
  if (updates.contactPhone !== undefined) {
    updatesList.push(`contact_phone = $${paramIndex++}`);
    values.push(updates.contactPhone);
  }
  if (updates.website !== undefined) {
    updatesList.push(`website = $${paramIndex++}`);
    values.push(updates.website);
  }
  if (updates.signupCompletedAt !== undefined) {
    updatesList.push(`signup_completed_at = $${paramIndex++}`);
    values.push(updates.signupCompletedAt);
  }
  if (updates.preferredLanguage !== undefined) {
    updatesList.push(`preferred_language = $${paramIndex++}`);
    values.push(updates.preferredLanguage);
  }

  if (updatesList.length === 0) {
    return getFacilityById(id);
  }

  updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const result = await query<Facility>(
      `UPDATE facilities 
       SET ${updatesList.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, password_hash as "passwordHash",
                 phone,
                 address_line1 as "addressLine1",
                 address_line2 as "addressLine2",
                 city,
                 country,
                 facility_type as "facilityType",
                 contact_name as "contactName",
                 contact_phone as "contactPhone",
                 website,
                 signup_completed_at as "signupCompletedAt",
                 COALESCE(preferred_language, NULL) as "preferredLanguage",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );
    return result.rows[0] || null;
  } catch (error: any) {
    if (
      error?.message?.includes("phone") ||
      error?.message?.includes("address_line1") ||
      error?.message?.includes("facility_type") ||
      error?.message?.includes("contact_name") ||
      error?.message?.includes("signup_completed_at")
    ) {
      // Fallback for older schemas without extended facility profile columns
      const baseUpdatesList: string[] = [];
      const baseValues: any[] = [];
      let baseIndex = 1;
      if (updates.name !== undefined) {
        baseUpdatesList.push(`name = $${baseIndex++}`);
        baseValues.push(updates.name);
      }
      if (updates.email !== undefined) {
        baseUpdatesList.push(`email = $${baseIndex++}`);
        baseValues.push(updates.email);
      }
      if (baseUpdatesList.length === 0) {
        return getFacilityById(id);
      }
      baseUpdatesList.push(`updated_at = CURRENT_TIMESTAMP`);
      baseValues.push(id);
      const result = await query<Facility>(
        `UPDATE facilities 
         SET ${baseUpdatesList.join(", ")}
         WHERE id = $${baseIndex}
         RETURNING id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`,
        baseValues
      );
      const facility = result.rows[0];
      if (!facility) return null;
      return {
        ...facility,
        referralCode: null,
        referredByFacilityId: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        country: null,
        facilityType: null,
        contactName: null,
        contactPhone: null,
        website: null,
        signupCompletedAt: null,
      };
    }
    throw error;
  }
}

// Legacy function - kept for backward compatibility (used by facility route)
export async function updateFacilityPassword(
  id: string,
  passwordHash: string
): Promise<boolean> {
  const result = await query(
    `UPDATE facilities 
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ==================== Report Queries ====================

export async function saveReport(report: EcgStructuredReport, facilityId: string, patientId?: string | null): Promise<void> {
  await query(
    `INSERT INTO ecg_reports (
      id, facility_id, patient_id, patient_info, measurements, abnormalities, clinical_impression,
      recommendations, decision_explanations, source_format, source_filename,
      signal_preview, image_preview, preprocess, raw_ai_text, model, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET
      patient_id = EXCLUDED.patient_id,
      patient_info = EXCLUDED.patient_info,
      measurements = EXCLUDED.measurements,
      abnormalities = EXCLUDED.abnormalities,
      clinical_impression = EXCLUDED.clinical_impression,
      recommendations = EXCLUDED.recommendations,
      decision_explanations = EXCLUDED.decision_explanations`,
    [
      report.id,
      facilityId,
      patientId || null,
      report.patient ? JSON.stringify(report.patient) : null,
      JSON.stringify(report.measurements),
      report.abnormalities || [],
      report.clinicalImpression,
      report.recommendations || null,
      report.decisionExplanations ? JSON.stringify(report.decisionExplanations) : null,
      report.source.format,
      report.source.filename || null,
      report.signalPreview ? JSON.stringify(report.signalPreview) : null,
      report.imagePreview ? JSON.stringify(report.imagePreview) : null,
      JSON.stringify(report.preprocess),
      report.rawAiText || null,
      report.model || null,
      report.createdAt,
    ]
  );
}

export async function getReport(id: string, facilityId?: string): Promise<EcgStructuredReport | null> {
  let sql = `SELECT * FROM ecg_reports WHERE id = $1`;
  const params: any[] = [id];

  if (facilityId) {
    sql += ` AND facility_id = $2`;
    params.push(facilityId);
  }

  const result = await query(sql, params);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    patient: row.patient_info ? JSON.parse(JSON.stringify(row.patient_info)) : undefined,
    patientId: row.patient_id || undefined, // Include patient_id if available
    source: {
      filename: row.source_filename,
      contentType: undefined,
      format: row.source_format,
    },
    signalPreview: row.signal_preview ? JSON.parse(JSON.stringify(row.signal_preview)) : undefined,
    imagePreview: row.image_preview ? JSON.parse(JSON.stringify(row.image_preview)) : undefined,
    measurements: JSON.parse(JSON.stringify(row.measurements)),
    abnormalities: row.abnormalities || [],
    clinicalImpression: row.clinical_impression,
    recommendations: row.recommendations || undefined,
    decisionExplanations: row.decision_explanations ? JSON.parse(JSON.stringify(row.decision_explanations)) : undefined,
    rawAiText: row.raw_ai_text || undefined,
    model: row.model || undefined,
    preprocess: JSON.parse(JSON.stringify(row.preprocess)),
  };
}

export async function getReportsByFacility(
  facilityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EcgStructuredReport[]> {
  const result = await query(
    `SELECT * FROM ecg_reports
     WHERE facility_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [facilityId, limit, offset]
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at.toISOString(),
    patient: row.patient_info ? JSON.parse(JSON.stringify(row.patient_info)) : undefined,
    source: {
      filename: row.source_filename,
      contentType: undefined,
      format: row.source_format,
    },
    signalPreview: row.signal_preview ? JSON.parse(JSON.stringify(row.signal_preview)) : undefined,
    imagePreview: row.image_preview ? JSON.parse(JSON.stringify(row.image_preview)) : undefined,
    measurements: JSON.parse(JSON.stringify(row.measurements)),
    abnormalities: row.abnormalities || [],
    clinicalImpression: row.clinical_impression,
    recommendations: row.recommendations || undefined,
    decisionExplanations: row.decision_explanations ? JSON.parse(JSON.stringify(row.decision_explanations)) : undefined,
    rawAiText: row.raw_ai_text || undefined,
    model: row.model || undefined,
    preprocess: JSON.parse(JSON.stringify(row.preprocess)),
  }));
}

// ==================== Analytics Queries ====================

export type AnalyticsSummary = {
  totalReports: number;
  totalAbnormalities: number;
  normalReports: number;
  abnormalReports: number;
  averageAge: number | null;
  maleCount: number;
  femaleCount: number;
  averageHeartRate: number | null;
  mostCommonAbnormality: string | null;
  reportsLast7Days: number;
  reportsLast30Days: number;
};

export type VolumeDataPoint = {
  date: string;
  count: number;
};

export type AbnormalityDistribution = {
  abnormality: string;
  count: number;
  percentage: number;
};

export type DemographicsData = {
  ageGroups: Array<{ range: string; count: number }>;
  sexDistribution: Array<{ sex: string; count: number; percentage: number }>;
};

export async function getAnalyticsSummary(
  facilityId: string,
  fromDate?: string,
  toDate?: string
): Promise<AnalyticsSummary> {
  let dateFilter = "";
  const params: any[] = [facilityId];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `AND ${conditions.join(" AND ")}`;
  }

  const result = await query(`
    SELECT 
      COUNT(*) as total_reports,
      SUM(array_length(abnormalities, 1)) as total_abnormalities,
      COUNT(*) FILTER (WHERE array_length(abnormalities, 1) = 0 OR abnormalities IS NULL) as normal_reports,
      COUNT(*) FILTER (WHERE array_length(abnormalities, 1) > 0) as abnormal_reports,
      AVG((patient_info->>'age')::numeric) as average_age,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'male') as male_count,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'female') as female_count,
      AVG((measurements->>'heartRateBpm')::numeric) as average_heart_rate
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
  `, params);

  const row = result.rows[0];
  
  // Get most common abnormality
  const abnormalityResult = await query(`
    SELECT unnest(abnormalities) as abnormality, COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
      AND abnormalities IS NOT NULL
      AND array_length(abnormalities, 1) > 0
    GROUP BY abnormality
    ORDER BY count DESC
    LIMIT 1
  `, params);
  
  const mostCommonAbnormality = abnormalityResult.rows[0]?.abnormality || null;

  // Get reports in last 7 and 30 days
  const recent7Days = await query(`
    SELECT COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
  `, [facilityId]);
  
  const recent30Days = await query(`
    SELECT COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1
      AND created_at >= NOW() - INTERVAL '30 days'
  `, [facilityId]);

  return {
    totalReports: parseInt(row.total_reports) || 0,
    totalAbnormalities: parseInt(row.total_abnormalities) || 0,
    normalReports: parseInt(row.normal_reports) || 0,
    abnormalReports: parseInt(row.abnormal_reports) || 0,
    averageAge: row.average_age ? parseFloat(row.average_age) : null,
    maleCount: parseInt(row.male_count) || 0,
    femaleCount: parseInt(row.female_count) || 0,
    averageHeartRate: row.average_heart_rate ? parseFloat(row.average_heart_rate) : null,
    mostCommonAbnormality,
    reportsLast7Days: parseInt(recent7Days.rows[0]?.count) || 0,
    reportsLast30Days: parseInt(recent30Days.rows[0]?.count) || 0,
  };
}

export async function getVolumeData(
  facilityId: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  fromDate?: string,
  toDate?: string
): Promise<VolumeDataPoint[]> {
  let dateFilter = "";
  const params: any[] = [facilityId];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `AND ${conditions.join(" AND ")}`;
  }

  let dateFormat: string;
  let interval: string;
  
  switch (period) {
    case "daily":
      dateFormat = "YYYY-MM-DD";
      interval = "day";
      break;
    case "weekly":
      dateFormat = "IYYY-IW";
      interval = "week";
      break;
    case "monthly":
      dateFormat = "YYYY-MM";
      interval = "month";
      break;
  }

  const result = await query(`
    SELECT 
      TO_CHAR(created_at, $${params.length + 1}) as date,
      COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
    GROUP BY date
    ORDER BY date ASC
  `, [...params, dateFormat]);

  return result.rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count),
  }));
}

export async function getAbnormalityDistribution(
  facilityId: string,
  fromDate?: string,
  toDate?: string,
  limit: number = 10
): Promise<AbnormalityDistribution[]> {
  let dateFilter = "";
  const params: any[] = [facilityId];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `AND ${conditions.join(" AND ")}`;
  }

  // Get total reports with abnormalities for percentage calculation
  const totalResult = await query(`
    SELECT COUNT(*) as total
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
      AND abnormalities IS NOT NULL
      AND array_length(abnormalities, 1) > 0
  `, params);
  
  const total = parseInt(totalResult.rows[0]?.total) || 1;

  const result = await query(`
    SELECT 
      unnest(abnormalities) as abnormality,
      COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
      AND abnormalities IS NOT NULL
      AND array_length(abnormalities, 1) > 0
    GROUP BY abnormality
    ORDER BY count DESC
    LIMIT $${params.length + 1}
  `, [...params, limit]);

  return result.rows.map((row) => ({
    abnormality: row.abnormality,
    count: parseInt(row.count),
    percentage: Math.round((parseInt(row.count) / total) * 100 * 10) / 10, // Round to 1 decimal
  }));
}

export async function getDemographicsData(
  facilityId: string,
  fromDate?: string,
  toDate?: string
): Promise<DemographicsData> {
  let dateFilter = "";
  const params: any[] = [facilityId];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `AND ${conditions.join(" AND ")}`;
  }

  // Age groups
  const ageGroupsResult = await query(`
    SELECT 
      CASE
        WHEN (patient_info->>'age')::numeric < 18 THEN '0-17'
        WHEN (patient_info->>'age')::numeric < 35 THEN '18-34'
        WHEN (patient_info->>'age')::numeric < 50 THEN '35-49'
        WHEN (patient_info->>'age')::numeric < 65 THEN '50-64'
        ELSE '65+'
      END as age_range,
      COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
      AND patient_info IS NOT NULL
      AND patient_info->>'age' IS NOT NULL
      AND (patient_info->>'age')::numeric IS NOT NULL
    GROUP BY 
      CASE
        WHEN (patient_info->>'age')::numeric < 18 THEN '0-17'
        WHEN (patient_info->>'age')::numeric < 35 THEN '18-34'
        WHEN (patient_info->>'age')::numeric < 50 THEN '35-49'
        WHEN (patient_info->>'age')::numeric < 65 THEN '50-64'
        ELSE '65+'
      END
    ORDER BY 
      MIN(CASE
        WHEN (patient_info->>'age')::numeric < 18 THEN 1
        WHEN (patient_info->>'age')::numeric < 35 THEN 2
        WHEN (patient_info->>'age')::numeric < 50 THEN 3
        WHEN (patient_info->>'age')::numeric < 65 THEN 4
        ELSE 5
      END)
  `, params);

  // Sex distribution
  const sexResult = await query(`
    SELECT 
      COALESCE(patient_info->>'sex', 'unknown') as sex,
      COUNT(*) as count
    FROM ecg_reports
    WHERE facility_id = $1 ${dateFilter}
      AND patient_info IS NOT NULL
    GROUP BY COALESCE(patient_info->>'sex', 'unknown')
  `, params);

  const totalSex = sexResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

  return {
    ageGroups: ageGroupsResult.rows.map((row) => ({
      range: row.age_range,
      count: parseInt(row.count),
    })),
    sexDistribution: sexResult.rows.map((row) => ({
      sex: row.sex,
      count: parseInt(row.count),
      percentage: totalSex > 0 ? Math.round((parseInt(row.count) / totalSex) * 100 * 10) / 10 : 0,
    })),
  };
}

// ==================== Wallet Management ====================

export type Wallet = {
  id: string;
  facilityId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WalletTransaction = {
  id: string;
  facilityId: string;
  type: "topup" | "deduction" | "refund" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  metadata?: any;
  createdAt: Date;
};

export type PricingConfig = {
  id: string;
  analysisType: "standard" | "image";
  pricePerAnalysis: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CountryPricing = {
  id: string;
  country: string;
  analysisType: "standard" | "image";
  pricePerAnalysis: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Initialize wallet for facility (called when facility is created)
export async function initializeFacilityWallet(facilityId: string): Promise<Wallet> {
  const result = await query<Wallet>(
    `INSERT INTO facility_wallets (facility_id, balance, currency)
     VALUES ($1, 0.00, 'GHS')
     ON CONFLICT (facility_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"`,
    [facilityId]
  );
  return result.rows[0];
}

// Get facility wallet
export async function getFacilityWallet(facilityId: string): Promise<Wallet | null> {
  const result = await query<Wallet>(
    `SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
     FROM facility_wallets
     WHERE facility_id = $1`,
    [facilityId]
  );
  if (result.rows.length === 0) {
    // Initialize wallet if it doesn't exist
    return await initializeFacilityWallet(facilityId);
  }
  return result.rows[0];
}

// Check if facility has sufficient balance
export async function checkSufficientBalance(facilityId: string, amount: number): Promise<boolean> {
  const wallet = await getFacilityWallet(facilityId);
  if (!wallet) return false;
  return wallet.balance >= amount;
}

// Deduct amount from wallet (atomic operation)
export async function deductFromWallet(
  facilityId: string,
  amount: number,
  description: string,
  referenceId?: string,
  metadata?: any
): Promise<{ success: boolean; transaction?: WalletTransaction; error?: string }> {
  const client = await getClient();
  
  try {
    await client.query("BEGIN");
    
    // Get current balance with row lock
    const walletResult = await client.query<Wallet>(
      `SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`,
      [facilityId]
    );

    if (walletResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Wallet not found" };
    }

    const wallet = walletResult.rows[0];
    const balanceBefore = parseFloat(wallet.balance.toString());

    if (balanceBefore < amount) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Insufficient balance" };
    }

    const balanceAfter = balanceBefore - amount;

    // Update wallet balance
    await client.query(
      `UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`,
      [balanceAfter, facilityId]
    );

    // Create transaction record
    const transactionResult = await client.query<WalletTransaction>(
      `INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'deduction', $2, $3, $4, $5, $6, 'completed', $7)
      RETURNING 
        id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
        balance_after as "balanceAfter", description, reference_id as "referenceId",
        status, metadata, created_at as "createdAt"`,
      [facilityId, amount, balanceBefore, balanceAfter, description, referenceId || null, metadata ? JSON.stringify(metadata) : null]
    );

    await client.query("COMMIT");
    client.release();

    return { success: true, transaction: transactionResult.rows[0] };
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    return { success: false, error: error?.message || "Failed to deduct from wallet" };
  }
}

// Add funds to wallet (for top-ups)
export async function addToWallet(
  facilityId: string,
  amount: number,
  description: string,
  referenceId?: string,
  metadata?: any
): Promise<{ success: boolean; transaction?: WalletTransaction; error?: string }> {
  const client = await getClient();
  
  try {
    // Ensure wallet exists
    await getFacilityWallet(facilityId);

    await client.query("BEGIN");

    // Get current balance with row lock
    const walletResult = await client.query<Wallet>(
      `SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`,
      [facilityId]
    );

    if (walletResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Wallet not found" };
    }

    const wallet = walletResult.rows[0];
    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + amount;

    // Update wallet balance
    await client.query(
      `UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`,
      [balanceAfter, facilityId]
    );

    // Create transaction record
    const transactionResult = await client.query<WalletTransaction>(
      `INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'topup', $2, $3, $4, $5, $6, 'completed', $7)
      RETURNING 
        id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
        balance_after as "balanceAfter", description, reference_id as "referenceId",
        status, metadata, created_at as "createdAt"`,
      [facilityId, amount, balanceBefore, balanceAfter, description, referenceId || null, metadata ? JSON.stringify(metadata) : null]
    );

    await client.query("COMMIT");
    client.release();

    return { success: true, transaction: transactionResult.rows[0] };
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    return { success: false, error: error?.message || "Failed to add to wallet" };
  }
}

// Get transaction history
export async function getWalletTransactions(
  facilityId: string,
  limit: number = 50,
  offset: number = 0,
  fromDate?: string,
  toDate?: string
): Promise<{ transactions: WalletTransaction[]; total: number }> {
  let dateFilter = "";
  const params: any[] = [facilityId];

  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `AND ${conditions.join(" AND ")}`;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM wallet_transactions
     WHERE facility_id = $1 ${dateFilter}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.total || "0");

  // Get transactions
  const result = await query<WalletTransaction>(
    `SELECT 
      id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
      balance_after as "balanceAfter", description, reference_id as "referenceId",
      status, metadata, created_at as "createdAt"
     FROM wallet_transactions
     WHERE facility_id = $1 ${dateFilter}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    transactions: result.rows.map((row) => ({
      ...row,
      metadata: row.metadata ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) : undefined,
    })),
    total,
  };
}

// Get pricing configuration
export async function getPricingConfig(): Promise<PricingConfig[]> {
  const result = await query<PricingConfig>(
    `SELECT 
      id, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
      currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM pricing_config
     WHERE is_active = true
     ORDER BY analysis_type`
  );
  return result.rows;
}

// Get price for analysis type (with country support)
export async function getAnalysisPrice(
  analysisType: "standard" | "image" = "standard",
  country?: string
): Promise<number> {
  const type = analysisType === "image" ? "image" : "standard";
  
  // If country is provided, try country-specific pricing first
  if (country) {
    const countryResult = await query<{ pricePerAnalysis: number }>(
      `SELECT price_per_analysis as "pricePerAnalysis"
       FROM country_pricing
       WHERE country = $1 AND analysis_type = $2 AND is_active = true
       LIMIT 1`,
      [country, type]
    );

    if (countryResult.rows.length > 0) {
      return parseFloat(countryResult.rows[0].pricePerAnalysis.toString());
    }
  }

  // Fallback to global pricing
  const result = await query<{ pricePerAnalysis: number }>(
    `SELECT price_per_analysis as "pricePerAnalysis"
     FROM pricing_config
     WHERE analysis_type = $1 AND is_active = true
     LIMIT 1`,
    [type]
  );

  if (result.rows.length === 0) {
    // Default pricing if not configured
    return analysisType === "image" ? 2.0 : 1.0;
  }

  return parseFloat(result.rows[0].pricePerAnalysis.toString());
}

// ==================== Top-Up Management ====================

export type TopUp = {
  id: string;
  facilityId: string;
  amountRequested: number;
  amountReceived: number | null;
  status: "pending" | "verified" | "failed" | "cancelled";
  paystackReference: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
};

// Create top-up record
export async function createTopUp(
  facilityId: string,
  amount: number,
  paystackReference: string
): Promise<TopUp> {
  const result = await query<TopUp>(
    `INSERT INTO topups (
      facility_id, amount_requested_cedis, paystack_reference, status
    ) VALUES ($1, $2, $3, 'pending')
    RETURNING 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"`,
    [facilityId, amount, paystackReference]
  );
  return result.rows[0];
}

// Get top-up by reference
export async function getTopUpByReference(
  paystackReference: string
): Promise<TopUp | null> {
  const result = await query<TopUp>(
    `SELECT 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     WHERE paystack_reference = $1`,
    [paystackReference]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Verify top-up (mark as verified and update wallet)
export async function verifyTopUp(
  paystackReference: string,
  amountReceived: number
): Promise<{ success: boolean; topUp?: TopUp; error?: string }> {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Get top-up with lock
    const topUpResult = await client.query<TopUp>(
      `SELECT 
        id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
        amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
        created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
       FROM topups
       WHERE paystack_reference = $1
       FOR UPDATE`,
      [paystackReference]
    );

    if (topUpResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Top-up not found" };
    }

    const topUp = topUpResult.rows[0];

    // Check if already verified
    if (topUp.status === "verified") {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Top-up already verified" };
    }

    // Update top-up status
    await client.query(
      `UPDATE topups
       SET status = 'verified',
           amount_received_cedis = $1,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE paystack_reference = $2`,
      [amountReceived, paystackReference]
    );

    // Get wallet with lock
    const walletResult = await client.query<Wallet>(
      `SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`,
      [topUp.facilityId]
    );

    if (walletResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Wallet not found" };
    }

    const wallet = walletResult.rows[0];
    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + amountReceived;

    // Update wallet balance
    await client.query(
      `UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`,
      [balanceAfter, topUp.facilityId]
    );

    // Create transaction record
    await client.query(
      `INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'topup', $2, $3, $4, $5, $6, 'completed', $7)`,
      [
        topUp.facilityId,
        amountReceived,
        balanceBefore,
        balanceAfter,
        `Wallet Top-Up via Paystack`,
        paystackReference,
        JSON.stringify({ paystackReference, topUpId: topUp.id }),
      ]
    );

    await client.query("COMMIT");
    client.release();

    // Get updated top-up
    const updatedTopUp = await getTopUpByReference(paystackReference);
    return { success: true, topUp: updatedTopUp! };
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    return { success: false, error: error?.message || "Failed to verify top-up" };
  }
}

// Mark top-up as failed
export async function markTopUpFailed(
  paystackReference: string,
  reason?: string
): Promise<void> {
  await query(
    `UPDATE topups
     SET status = 'failed', updated_at = NOW()
     WHERE paystack_reference = $1`,
    [paystackReference]
  );
}

// Cancel/delete pending top-up
export async function cancelTopUp(
  topUpId: string,
  facilityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE topups
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND facility_id = $2 AND status = 'pending'
       RETURNING id`,
      [topUpId, facilityId]
    );

    if (result.rowCount === 0) {
      return { success: false, error: "Top-up not found or cannot be cancelled" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to cancel top-up" };
  }
}

// Get top-up by ID
export async function getTopUpById(
  topUpId: string
): Promise<TopUp | null> {
  const result = await query<TopUp>(
    `SELECT 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     WHERE id = $1`,
    [topUpId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Get top-ups for facility
export async function getFacilityTopUps(
  facilityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ topUps: TopUp[]; total: number }> {
  const countResult = await query(
    `SELECT COUNT(*) as total FROM topups WHERE facility_id = $1`,
    [facilityId]
  );
  const total = parseInt(countResult.rows[0]?.total || "0");

  const result = await query<TopUp>(
    `SELECT 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     WHERE facility_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [facilityId, limit, offset]
  );

  return {
    topUps: result.rows,
    total,
  };
}

export async function getAllTopUps(
  limit: number = 50,
  offset: number = 0
): Promise<{ topUps: TopUp[]; total: number }> {
  const countResult = await query(`SELECT COUNT(*) as total FROM topups`);
  const total = parseInt(countResult.rows[0]?.total || "0");

  const result = await query<TopUp>(
    `SELECT 
      id, facility_id as "facilityId", 
      amount_requested_cedis::numeric as "amountRequested",
      amount_received_cedis::numeric as "amountReceived", 
      status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  // Ensure numeric values are properly converted
  const topUps = result.rows.map(topUp => ({
    ...topUp,
    amountRequested: typeof topUp.amountRequested === 'string' 
      ? parseFloat(topUp.amountRequested) 
      : (topUp.amountRequested || 0),
    amountReceived: topUp.amountReceived 
      ? (typeof topUp.amountReceived === 'string' 
          ? parseFloat(topUp.amountReceived) 
          : topUp.amountReceived)
      : null,
  }));

  return {
    topUps,
    total,
  };
}

// Initialize default pricing (call this on first setup)
export async function initializeDefaultPricing(): Promise<void> {
  // Check if pricing exists
  const existing = await query(`SELECT COUNT(*) as count FROM pricing_config`);
  if (parseInt(existing.rows[0]?.count || "0") > 0) {
    return; // Pricing already initialized
  }

  // Insert default pricing (Ghana Cedis)
  await query(
    `INSERT INTO pricing_config (analysis_type, price_per_analysis, currency, is_active)
     VALUES 
       ('standard', 10.00, 'GHS', true),
       ('image', 16.00, 'GHS', true)
     ON CONFLICT DO NOTHING`
  );
}

export async function getAllReports(limit: number = 50, offset: number = 0): Promise<EcgStructuredReport[]> {
  const result = await query(
    `SELECT * FROM ecg_reports
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at.toISOString(),
    patient: row.patient_info ? JSON.parse(JSON.stringify(row.patient_info)) : undefined,
    source: {
      filename: row.source_filename,
      contentType: undefined,
      format: row.source_format,
    },
    signalPreview: row.signal_preview ? JSON.parse(JSON.stringify(row.signal_preview)) : undefined,
    imagePreview: row.image_preview ? JSON.parse(JSON.stringify(row.image_preview)) : undefined,
    measurements: JSON.parse(JSON.stringify(row.measurements)),
    abnormalities: row.abnormalities || [],
    clinicalImpression: row.clinical_impression,
    recommendations: row.recommendations || undefined,
    decisionExplanations: row.decision_explanations ? JSON.parse(JSON.stringify(row.decision_explanations)) : undefined,
    rawAiText: row.raw_ai_text || undefined,
    model: row.model || undefined,
    preprocess: JSON.parse(JSON.stringify(row.preprocess)),
  }));
}

export async function getReportCount(facilityId?: string): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ecg_reports`;
  const params: any[] = [];

  if (facilityId) {
    sql += ` WHERE facility_id = $1`;
    params.push(facilityId);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count, 10);
}

// ==================== Admin Analytics (Platform-wide) ====================

export async function getAdminVolumeData(
  period: "daily" | "weekly" | "monthly" = "daily",
  fromDate?: string,
  toDate?: string
): Promise<VolumeDataPoint[]> {
  let dateFilter = "";
  const params: any[] = [];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `WHERE ${conditions.join(" AND ")}`;
  }

  let dateFormat: string;
  
  switch (period) {
    case "daily":
      dateFormat = "YYYY-MM-DD";
      break;
    case "weekly":
      dateFormat = "IYYY-IW";
      break;
    case "monthly":
      dateFormat = "YYYY-MM";
      break;
  }

  const sql = `
    SELECT 
      TO_CHAR(created_at, $${params.length + 1}) as date,
      COUNT(*) as count
    FROM ecg_reports
    ${dateFilter}
    GROUP BY date
    ORDER BY date ASC
  `;
  const result = await query(sql, [...params, dateFormat]);

  return result.rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count),
  }));
}

export async function getAdminAbnormalityDistribution(
  fromDate?: string,
  toDate?: string,
  limit: number = 10
): Promise<AbnormalityDistribution[]> {
  let dateFilter = "";
  const params: any[] = [];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `WHERE ${conditions.join(" AND ")}`;
  }

  // Get total reports with abnormalities for percentage calculation
  const totalWhereClause = dateFilter 
    ? `${dateFilter} AND abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0`
    : "WHERE abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0";
  const totalResult = await query(`
    SELECT COUNT(*) as total
    FROM ecg_reports
    ${totalWhereClause}
  `, params);
  
  const total = parseInt(totalResult.rows[0]?.total) || 1;

  const whereClause = dateFilter 
    ? `${dateFilter} AND abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0`
    : "WHERE abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0";
  const result = await query(`
    SELECT 
      unnest(abnormalities) as abnormality,
      COUNT(*) as count
    FROM ecg_reports
    ${whereClause}
    GROUP BY abnormality
    ORDER BY count DESC
    LIMIT $${params.length + 1}
  `, [...params, limit]);

  return result.rows.map((row) => ({
    abnormality: row.abnormality,
    count: parseInt(row.count),
    percentage: Math.round((parseInt(row.count) / total) * 100 * 10) / 10,
  }));
}

export async function getAdminDemographicsData(
  fromDate?: string,
  toDate?: string
): Promise<DemographicsData> {
  let dateFilter = "";
  const params: any[] = [];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `WHERE ${conditions.join(" AND ")}`;
  }

  const result = await query(`
    SELECT 
      AVG((patient_info->>'age')::numeric) as average_age,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'male') as male_count,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'female') as female_count,
      COUNT(*) FILTER (WHERE patient_info->>'sex' IS NULL OR patient_info->>'sex' = '') as unknown_count
    FROM ecg_reports
    ${dateFilter}
  `, params);

  const row = result.rows[0];
  const total = (parseInt(row.male_count) || 0) + (parseInt(row.female_count) || 0) + (parseInt(row.unknown_count) || 0);

  return {
    averageAge: row.average_age ? parseFloat(row.average_age) : null,
    sexDistribution: [
      {
        sex: "Male",
        count: parseInt(row.male_count) || 0,
        percentage: total > 0 ? Math.round(((parseInt(row.male_count) || 0) / total) * 100 * 10) / 10 : 0,
      },
      {
        sex: "Female",
        count: parseInt(row.female_count) || 0,
        percentage: total > 0 ? Math.round(((parseInt(row.female_count) || 0) / total) * 100 * 10) / 10 : 0,
      },
      {
        sex: "Unknown",
        count: parseInt(row.unknown_count) || 0,
        percentage: total > 0 ? Math.round(((parseInt(row.unknown_count) || 0) / total) * 100 * 10) / 10 : 0,
      },
    ],
  };
}

export async function getAdminAnalyticsSummary(
  fromDate?: string,
  toDate?: string
): Promise<AnalyticsSummary> {
  let dateFilter = "";
  const params: any[] = [];
  
  if (fromDate || toDate) {
    const conditions: string[] = [];
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`created_at <= $${params.length}`);
    }
    dateFilter = `WHERE ${conditions.join(" AND ")}`;
  }

  const result = await query(`
    SELECT 
      COUNT(*) as total_reports,
      SUM(array_length(abnormalities, 1)) as total_abnormalities,
      COUNT(*) FILTER (WHERE array_length(abnormalities, 1) = 0 OR abnormalities IS NULL) as normal_reports,
      COUNT(*) FILTER (WHERE array_length(abnormalities, 1) > 0) as abnormal_reports,
      AVG((patient_info->>'age')::numeric) as average_age,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'male') as male_count,
      COUNT(*) FILTER (WHERE patient_info->>'sex' = 'female') as female_count,
      AVG((measurements->>'heartRateBpm')::numeric) as average_heart_rate
    FROM ecg_reports
    ${dateFilter}
  `, params);

  const row = result.rows[0];
  
  // Get most common abnormality
  const abnormalityWhere = dateFilter 
    ? `${dateFilter} AND abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0`
    : `WHERE abnormalities IS NOT NULL AND array_length(abnormalities, 1) > 0`;
  
  const abnormalityResult = await query(`
    SELECT unnest(abnormalities) as abnormality, COUNT(*) as count
    FROM ecg_reports
    ${abnormalityWhere}
    GROUP BY abnormality
    ORDER BY count DESC
    LIMIT 1
  `, params);
  
  const mostCommonAbnormality = abnormalityResult.rows[0]?.abnormality || null;

  // Get reports in last 7 and 30 days
  const recent7Days = await query(`
    SELECT COUNT(*) as count
    FROM ecg_reports
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `, []);
  
  const recent30Days = await query(`
    SELECT COUNT(*) as count
    FROM ecg_reports
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `, []);

  return {
    totalReports: parseInt(row.total_reports) || 0,
    totalAbnormalities: parseInt(row.total_abnormalities) || 0,
    normalReports: parseInt(row.normal_reports) || 0,
    abnormalReports: parseInt(row.abnormal_reports) || 0,
    averageAge: row.average_age ? parseFloat(row.average_age) : null,
    maleCount: parseInt(row.male_count) || 0,
    femaleCount: parseInt(row.female_count) || 0,
    averageHeartRate: row.average_heart_rate ? parseFloat(row.average_heart_rate) : null,
    mostCommonAbnormality,
    reportsLast7Days: parseInt(recent7Days.rows[0]?.count) || 0,
    reportsLast30Days: parseInt(recent30Days.rows[0]?.count) || 0,
  };
}

export type FacilityHealthSummary = {
  facilityId: string;
  facilityName: string;
  facilityEmail: string;
  totalReports: number;
  abnormalReports: number;
  abnormalRate: number;
  analysisRevenue: number;
  lastReportAt: string | null;
};

export async function getAdminFacilityHealth(limit: number = 10): Promise<FacilityHealthSummary[]> {
  const result = await query(`
    WITH report_stats AS (
      SELECT
        facility_id,
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE array_length(abnormalities, 1) > 0) as abnormal_reports,
        MAX(created_at) as last_report_at
      FROM ecg_reports
      GROUP BY facility_id
    ),
    wallet_stats AS (
      SELECT
        facility_id,
        SUM(CASE WHEN type = 'deduction' AND status = 'completed' THEN amount ELSE 0 END) as analysis_revenue
      FROM wallet_transactions
      GROUP BY facility_id
    )
    SELECT
      f.id,
      f.name,
      f.email,
      COALESCE(rs.total_reports, 0) as total_reports,
      COALESCE(rs.abnormal_reports, 0) as abnormal_reports,
      rs.last_report_at,
      COALESCE(ws.analysis_revenue, 0) as analysis_revenue
    FROM facilities f
    LEFT JOIN report_stats rs ON rs.facility_id = f.id
    LEFT JOIN wallet_stats ws ON ws.facility_id = f.id
    ORDER BY COALESCE(rs.total_reports, 0) DESC, f.created_at ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row) => {
    const totalReports = parseInt(row.total_reports) || 0;
    const abnormalReports = parseInt(row.abnormal_reports) || 0;
    const abnormalRate = totalReports > 0 ? Math.round((abnormalReports / totalReports) * 1000) / 10 : 0;
    return {
      facilityId: row.id,
      facilityName: row.name,
      facilityEmail: row.email,
      totalReports,
      abnormalReports,
      abnormalRate,
      analysisRevenue: parseFloat(row.analysis_revenue) || 0,
      lastReportAt: row.last_report_at ? row.last_report_at.toISOString() : null,
    };
  });
}

// ==================== Admin Audit Logs ====================

export type AdminAuditLog = {
  id: string;
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
};

export async function createAdminAuditLog(params: {
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await query(
    `INSERT INTO admin_audit_logs (
      admin_id, action, entity_type, entity_id, metadata, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.adminId || null,
      params.action,
      params.entityType || null,
      params.entityId || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.ipAddress || null,
      params.userAgent || null,
    ]
  );
}

export async function getAdminAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<AdminAuditLog[]> {
  const result = await query<AdminAuditLog>(
    `SELECT id, admin_id as "adminId", action, entity_type as "entityType", entity_id as "entityId",
            metadata, ip_address as "ipAddress", user_agent as "userAgent", created_at as "createdAt"
     FROM admin_audit_logs
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

// ==================== Paystack Webhook Events ====================

export type PaystackWebhookEvent = {
  id: string;
  eventType: string;
  reference?: string;
  status: "pending" | "processed" | "failed";
  attempts: number;
  payload: any;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
};

export async function createPaystackWebhookEvent(
  eventType: string,
  reference: string | null,
  payload: any
): Promise<PaystackWebhookEvent> {
  const result = await query<PaystackWebhookEvent>(
    `INSERT INTO paystack_webhook_events (event_type, reference, payload, status, attempts)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING id, event_type as "eventType", reference, status, attempts, payload, error,
               processed_at as "processedAt", created_at as "createdAt"`,
    [eventType, reference, JSON.stringify(payload)]
  );
  return result.rows[0];
}

export async function updatePaystackWebhookEvent(
  id: string,
  status: "pending" | "processed" | "failed",
  error?: string
): Promise<void> {
  await query(
    `UPDATE paystack_webhook_events
     SET status = $1, error = $2, attempts = attempts + 1, processed_at = NOW()
     WHERE id = $3`,
    [status, error || null, id]
  );
}

export async function getPaystackWebhookEvents(
  limit: number = 50,
  offset: number = 0,
  status?: string
): Promise<PaystackWebhookEvent[]> {
  try {
    const params: any[] = [limit, offset];
    let whereClause = "";
    if (status) {
      params.push(status);
      whereClause = `WHERE status = $3`;
    }
    const result = await query<PaystackWebhookEvent>(
      `SELECT id, event_type as "eventType", reference, status, attempts, payload, error,
              processed_at as "processedAt", created_at as "createdAt"
       FROM paystack_webhook_events
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    return result.rows;
  } catch (err: any) {
    // If table doesn't exist, return empty array instead of throwing
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      console.warn("paystack_webhook_events table does not exist. Please run the migration: backend/src/db/migrate_admin_ops.sql");
      return [];
    }
    throw err;
  }
}

export async function getPaystackWebhookEventById(id: string): Promise<PaystackWebhookEvent | null> {
  const result = await query<PaystackWebhookEvent>(
    `SELECT id, event_type as "eventType", reference, status, attempts, payload, error,
            processed_at as "processedAt", created_at as "createdAt"
     FROM paystack_webhook_events
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ==================== System Events ====================

export type SystemEvent = {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  message: string;
  context?: any;
  createdAt: Date;
};

export async function logSystemEvent(params: {
  eventType: "ai_error" | "email_error" | "job_error" | "webhook_error";
  severity?: "info" | "warning" | "error";
  message: string;
  context?: any;
}): Promise<void> {
  await query(
    `INSERT INTO system_events (event_type, severity, message, context)
     VALUES ($1, $2, $3, $4)`,
    [
      params.eventType,
      params.severity || "error",
      params.message,
      params.context ? JSON.stringify(params.context) : null,
    ]
  );
}

export async function getSystemEventSummary(): Promise<{
  last24hErrors: number;
  last24hEmailErrors: number;
  last24hAiErrors: number;
  lastEventAt: string | null;
}> {
  try {
    const totalErrors = await query(`SELECT COUNT(*) as count FROM system_events WHERE created_at >= NOW() - INTERVAL '24 hours'`);
    const emailErrors = await query(
      `SELECT COUNT(*) as count FROM system_events WHERE event_type = 'email_error' AND created_at >= NOW() - INTERVAL '24 hours'`
    );
    const aiErrors = await query(
      `SELECT COUNT(*) as count FROM system_events WHERE event_type = 'ai_error' AND created_at >= NOW() - INTERVAL '24 hours'`
    );
    const lastEvent = await query(`SELECT created_at FROM system_events ORDER BY created_at DESC LIMIT 1`);

    return {
      last24hErrors: parseInt(totalErrors.rows[0]?.count) || 0,
      last24hEmailErrors: parseInt(emailErrors.rows[0]?.count) || 0,
      last24hAiErrors: parseInt(aiErrors.rows[0]?.count) || 0,
      lastEventAt: lastEvent.rows[0]?.created_at ? lastEvent.rows[0].created_at.toISOString() : null,
    };
  } catch (err: any) {
    // If table doesn't exist, return default values instead of throwing
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      console.warn("system_events table does not exist. Please run the migration: backend/src/db/migrate_admin_ops.sql");
      return {
        last24hErrors: 0,
        last24hEmailErrors: 0,
        last24hAiErrors: 0,
        lastEventAt: null,
      };
    }
    throw err;
  }
}

export async function getSystemEvents(
  limit: number = 50,
  offset: number = 0,
  eventType?: string
): Promise<SystemEvent[]> {
  try {
    const params: any[] = [limit, offset];
    let whereClause = "";
    if (eventType) {
      params.push(eventType);
      whereClause = `WHERE event_type = $3`;
    }
    const result = await query<SystemEvent>(
      `SELECT id, event_type as "eventType", severity, message, context, created_at as "createdAt"
       FROM system_events
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    return result.rows;
  } catch (err: any) {
    // If table doesn't exist, return empty array instead of throwing
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      console.warn("system_events table does not exist. Please run the migration: backend/src/db/migrate_admin_ops.sql");
      return [];
    }
    throw err;
  }
}

// ==================== Retention & Anonymization ====================

export async function anonymizeReportsOlderThan(days: number): Promise<number> {
  const result = await query(
    `UPDATE ecg_reports
     SET patient_info = (
       jsonb_set(
         COALESCE(patient_info, '{}'::jsonb),
         '{name}',
         to_jsonb('Patient ' || substring(id, 1, 8)),
         true
       ) - 'medicalRecordNumber'
     )
     WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [days]
  );
  return result.rowCount || 0;
}

export async function purgeReportsOlderThan(days: number): Promise<number> {
  const result = await query(
    `DELETE FROM ecg_reports
     WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [days]
  );
  return result.rowCount || 0;
}

// ==================== Password Reset Tokens ====================

export type PasswordResetToken = {
  id: string;
  email: string;
  token: string;
  userType: "admin" | "facility";
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

export async function createPasswordResetToken(
  email: string,
  token: string,
  userType: "admin" | "facility",
  expiresInHours: number = 1
): Promise<PasswordResetToken> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Invalidate any existing tokens for this email
  await query(
    `UPDATE password_reset_tokens SET used = true WHERE email = $1 AND user_type = $2 AND used = false`,
    [email, userType]
  );

  const result = await query<PasswordResetToken>(
    `INSERT INTO password_reset_tokens (email, token, user_type, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, token, user_type as "userType", expires_at as "expiresAt", used, created_at as "createdAt"`,
    [email, token, userType, expiresAt]
  );
  return result.rows[0];
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const result = await query<PasswordResetToken>(
    `SELECT id, email, token, user_type as "userType", expires_at as "expiresAt", used, created_at as "createdAt"
     FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  await query(
    `UPDATE password_reset_tokens SET used = true WHERE token = $1`,
    [token]
  );
}

export async function updateAdminPassword(adminId: string, newPasswordHash: string): Promise<void> {
  await query(
    `UPDATE admins SET password_hash = $1 WHERE id = $2`,
    [newPasswordHash, adminId]
  );
}

// Update facility password (for password reset - different signature)
export async function updateFacilityPasswordForReset(facilityId: string, newPasswordHash: string): Promise<void> {
  await query(
    `UPDATE facilities SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newPasswordHash, facilityId]
  );
}

// ==================== Revenue Statistics ====================

export type RevenueStats = {
  totalRevenue: number;
  revenueFromTopUps: number;
  revenueFromAnalysis: number;
  totalTopUps: number;
  totalAnalyses: number;
  currency: string;
  revenueByMonth: Array<{ month: string; revenue: number }>;
};

// Note: PricingConfig type is already defined above (line 577), so we don't redefine it here

export async function getRevenueStats(): Promise<RevenueStats> {
  // Get total revenue from verified top-ups
  const topUpsResult = await query<{ total: number; count: number }>(
    `SELECT 
      COALESCE(SUM(amount_received_cedis), 0) as total,
      COUNT(*) as count
     FROM topups
     WHERE status = 'verified' AND amount_received_cedis IS NOT NULL`
  );
  const revenueFromTopUps = parseFloat(topUpsResult.rows[0]?.total?.toString() || "0");
  const totalTopUps = parseInt(topUpsResult.rows[0]?.count?.toString() || "0", 10);

  // Get total revenue from deductions (analysis charges)
  const deductionsResult = await query<{ total: number; count: number }>(
    `SELECT 
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
     FROM wallet_transactions
     WHERE type = 'deduction' AND status = 'completed'`
  );
  const revenueFromAnalysis = parseFloat(deductionsResult.rows[0]?.total?.toString() || "0");
  const totalAnalyses = parseInt(deductionsResult.rows[0]?.count?.toString() || "0", 10);

  // Get revenue by month (last 12 months)
  const monthlyRevenueResult = await query<{ month: string; revenue: number }>(
    `SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COALESCE(SUM(amount_received_cedis), 0) as revenue
     FROM topups
     WHERE status = 'verified' 
       AND amount_received_cedis IS NOT NULL
       AND created_at >= NOW() - INTERVAL '12 months'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM')
     ORDER BY month DESC
     LIMIT 12`
  );

  const revenueByMonth = monthlyRevenueResult.rows.map((row) => ({
    month: row.month,
    revenue: parseFloat(row.revenue?.toString() || "0"),
  }));

  const totalRevenue = revenueFromTopUps; // Total revenue is from top-ups

  return {
    totalRevenue,
    revenueFromTopUps,
    revenueFromAnalysis,
    totalTopUps,
    totalAnalyses,
    currency: "GHS",
    revenueByMonth,
  };
}

// Get revenue by facility
export type FacilityRevenue = {
  facilityId: string;
  facilityName: string;
  facilityEmail: string;
  totalTopUpRevenue: number;
  totalAnalysisRevenue: number;
  totalRevenue: number;
  topUpCount: number;
  analysisCount: number;
};

export async function getRevenueByFacility(): Promise<FacilityRevenue[]> {
  // Get all facilities
  const facilities = await getAllFacilities();
  
  // Get revenue for each facility
  const facilityRevenues: FacilityRevenue[] = [];
  
  for (const facility of facilities) {
    // Get top-up revenue for this facility
    const topUpsResult = await query<{ total: number; count: number }>(
      `SELECT 
        COALESCE(SUM(amount_received_cedis), 0) as total,
        COUNT(*) as count
       FROM topups
       WHERE facility_id = $1 AND status = 'verified' AND amount_received_cedis IS NOT NULL`,
      [facility.id]
    );
    const topUpRevenue = parseFloat(topUpsResult.rows[0]?.total?.toString() || "0");
    const topUpCount = parseInt(topUpsResult.rows[0]?.count?.toString() || "0", 10);
    
    // Get analysis revenue (deductions) for this facility
    const deductionsResult = await query<{ total: number; count: number }>(
      `SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
       FROM wallet_transactions
       WHERE facility_id = $1 AND type = 'deduction' AND status = 'completed'`,
      [facility.id]
    );
    const analysisRevenue = parseFloat(deductionsResult.rows[0]?.total?.toString() || "0");
    const analysisCount = parseInt(deductionsResult.rows[0]?.count?.toString() || "0", 10);
    
    facilityRevenues.push({
      facilityId: facility.id,
      facilityName: facility.name,
      facilityEmail: facility.email,
      totalTopUpRevenue: topUpRevenue,
      totalAnalysisRevenue: analysisRevenue,
      totalRevenue: topUpRevenue, // Total revenue is from top-ups
      topUpCount,
      analysisCount,
    });
  }
  
  // Sort by total revenue descending
  return facilityRevenues.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// Get revenue by analysis type
export type RevenueByAnalysisType = {
  analysisType: "standard" | "image";
  revenue: number;
  count: number;
};

export async function getRevenueByAnalysisType(): Promise<RevenueByAnalysisType[]> {
  // Get deductions grouped by analysis type from metadata
  const result = await query<{ analysisType: string; total: number; count: number }>(
    `SELECT 
      COALESCE(metadata->>'analysisType', 'standard') as "analysisType",
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
     FROM wallet_transactions
     WHERE type = 'deduction' AND status = 'completed'
     GROUP BY COALESCE(metadata->>'analysisType', 'standard')`
  );
  
  return result.rows.map((row) => ({
    analysisType: (row.analysisType === "image" ? "image" : "standard") as "standard" | "image",
    revenue: parseFloat(row.total?.toString() || "0"),
    count: parseInt(row.count?.toString() || "0", 10),
  }));
}

// ==================== Pricing Management ====================

export async function updatePricing(
  analysisType: "standard" | "image",
  pricePerAnalysis: number
): Promise<PricingConfig> {
  // Deactivate old pricing
  await query(
    `UPDATE pricing_config 
     SET is_active = false, updated_at = NOW()
     WHERE analysis_type = $1 AND is_active = true`,
    [analysisType]
  );

  // Create new pricing entry
  const result = await query<PricingConfig>(
    `INSERT INTO pricing_config (analysis_type, price_per_analysis, currency, is_active)
     VALUES ($1, $2, 'GHS', true)
     RETURNING 
       id, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
       currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    [analysisType, pricePerAnalysis]
  );

  return result.rows[0];
}

// ==================== Country Pricing Management ====================

export async function getCountryPricing(country?: string): Promise<CountryPricing[]> {
  try {
    if (country) {
      const result = await query<CountryPricing>(
        `SELECT 
          id, country, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
          currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
         FROM country_pricing
         WHERE country = $1 AND is_active = true
         ORDER BY analysis_type`,
        [country]
      );
      return result.rows;
    }

    // Get all country pricing
    const result = await query<CountryPricing>(
      `SELECT 
        id, country, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
        currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM country_pricing
       WHERE is_active = true
       ORDER BY country, analysis_type`
    );
    return result.rows;
  } catch (err: any) {
    // If table doesn't exist, return empty array instead of throwing
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      console.warn("country_pricing table does not exist. Please run the migration: backend/src/db/migrate_country_pricing.sql");
      return [];
    }
    throw err;
  }
}

export async function getAllCountryPricing(): Promise<CountryPricing[]> {
  try {
    const result = await query<CountryPricing>(
      `SELECT 
        id, country, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
        currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM country_pricing
       ORDER BY country, analysis_type, created_at DESC`
    );
    return result.rows;
  } catch (err: any) {
    // If table doesn't exist, return empty array instead of throwing
    if (err?.message?.includes("does not exist") || err?.code === "42P01") {
      console.warn("country_pricing table does not exist. Please run the migration: backend/src/db/migrate_country_pricing.sql");
      return [];
    }
    throw err;
  }
}

export async function setCountryPricing(
  country: string,
  analysisType: "standard" | "image",
  pricePerAnalysis: number,
  currency: string = "GHS"
): Promise<CountryPricing> {
  // Deactivate old pricing for this country/type
  await query(
    `UPDATE country_pricing 
     SET is_active = false, updated_at = NOW()
     WHERE country = $1 AND analysis_type = $2 AND is_active = true`,
    [country, analysisType]
  );

  // Create new pricing entry
  const result = await query<CountryPricing>(
    `INSERT INTO country_pricing (country, analysis_type, price_per_analysis, currency, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING 
       id, country, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
       currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    [country, analysisType, pricePerAnalysis, currency]
  );

  return result.rows[0];
}

export async function deleteCountryPricing(id: string): Promise<boolean> {
  const result = await query(
    `UPDATE country_pricing 
     SET is_active = false, updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ==================== Platform Settings ====================

export type PlatformSetting = {
  id: string;
  settingKey: string;
  settingValue: any;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
};

export async function getPlatformSetting(settingKey: string): Promise<PlatformSetting | null> {
  try {
    const result = await query<PlatformSetting>(
      `SELECT id, setting_key as "settingKey", setting_value as "settingValue", description, 
              updated_at as "updatedAt", updated_by as "updatedBy"
       FROM platform_settings
       WHERE setting_key = $1`,
      [settingKey]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    // Table doesn't exist yet (migration not run) - return null
    if (error?.message?.includes("platform_settings") || error?.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
}

export async function updatePlatformSetting(
  settingKey: string,
  settingValue: any,
  updatedBy?: string
): Promise<PlatformSetting> {
  const result = await query<PlatformSetting>(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (setting_key) 
     DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = NOW()
     RETURNING id, setting_key as "settingKey", setting_value as "settingValue", description, 
               updated_at as "updatedAt", updated_by as "updatedBy"`,
    [settingKey, JSON.stringify(settingValue), updatedBy || null]
  );
  return result.rows[0];
}

// ==================== Referral System ====================

export type Referral = {
  id: string;
  referringFacilityId: string;
  referredFacilityId: string;
  referralBonusAmount: number;
  signupBonusAmount: number;
  status: string;
  createdAt: Date;
};

export type ReferralStats = {
  referralCode: string;
  totalReferrals: number;
  totalReferralBonus: number;
  totalSignupBonuses: number;
  referrals: Array<{
    referredFacilityName: string;
    referredFacilityEmail: string;
    bonusAmount: number;
    signupBonusAmount: number;
    createdAt: Date;
  }>;
};

export async function getFacilityReferralCode(facilityId: string): Promise<string | null> {
  try {
    const result = await query<{ referralCode: string }>(
      `SELECT referral_code as "referralCode" FROM facilities WHERE id = $1`,
      [facilityId]
    );
    
    if (result.rows.length === 0) return null;
    
    // If no referral code exists, generate one
    if (!result.rows[0].referralCode) {
      let newCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await query(
          `SELECT id FROM facilities WHERE referral_code = $1`,
          [newCode]
        );
        if (existing.rows.length === 0) break;
        newCode = generateReferralCode();
        attempts++;
      }
      
      await query(
        `UPDATE facilities SET referral_code = $1 WHERE id = $2`,
        [newCode, facilityId]
      );
      
      return newCode;
    }
    
    return result.rows[0].referralCode;
  } catch (error: any) {
    // Column doesn't exist yet (migration not run)
    if (error?.message?.includes("referral_code") || error?.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
}

export async function getFacilityReferralStats(facilityId: string): Promise<ReferralStats> {
  try {
    const referralCode = await getFacilityReferralCode(facilityId);
    
    if (!referralCode) {
      return {
        referralCode: "",
        totalReferrals: 0,
        totalReferralBonus: 0,
        totalSignupBonuses: 0,
        referrals: [],
      };
    }
    
    const referralsResult = await query<{
      referredFacilityId: string;
      referredFacilityName: string;
      referredFacilityEmail: string;
      referralBonusAmount: number;
      signupBonusAmount: number;
      createdAt: Date;
    }>(
      `SELECT 
        r.referred_facility_id as "referredFacilityId",
        f.name as "referredFacilityName",
        f.email as "referredFacilityEmail",
        r.referral_bonus_amount as "referralBonusAmount",
        r.signup_bonus_amount as "signupBonusAmount",
        r.created_at as "createdAt"
       FROM referrals r
       JOIN facilities f ON r.referred_facility_id = f.id
       WHERE r.referring_facility_id = $1 AND r.status = 'completed'
       ORDER BY r.created_at DESC`,
      [facilityId]
    );
    
    const referrals = referralsResult.rows.map((row) => ({
      referredFacilityName: row.referredFacilityName,
      referredFacilityEmail: row.referredFacilityEmail,
      bonusAmount: parseFloat(row.referralBonusAmount.toString()),
      signupBonusAmount: parseFloat(row.signupBonusAmount.toString()),
      createdAt: row.createdAt,
    }));
    
    const totalReferralBonus = referrals.reduce((sum, r) => sum + r.bonusAmount, 0);
    const totalSignupBonuses = referrals.reduce((sum, r) => sum + r.signupBonusAmount, 0);
    
    return {
      referralCode,
      totalReferrals: referrals.length,
      totalReferralBonus,
      totalSignupBonuses,
      referrals,
    };
  } catch (error: any) {
    // Tables don't exist yet (migration not run)
    if (error?.message?.includes("referrals") || error?.message?.includes("does not exist")) {
      return {
        referralCode: "",
        totalReferrals: 0,
        totalReferralBonus: 0,
        totalSignupBonuses: 0,
        referrals: [],
      };
    }
    throw error;
  }
}

export async function getAdminReferralStats(): Promise<{
  totalReferrals: number;
  totalReferralBonuses: number;
  totalSignupBonuses: number;
  topReferringFacilities: Array<{
    facilityId: string;
    facilityName: string;
    referralCount: number;
    totalBonus: number;
  }>;
}> {
  try {
    const totalResult = await query<{ count: number; referralBonus: number; signupBonus: number }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(referral_bonus_amount), 0) as "referralBonus",
        COALESCE(SUM(signup_bonus_amount), 0) as "signupBonus"
       FROM referrals
       WHERE status = 'completed'`
    );
    
    const topFacilitiesResult = await query<{
      facilityId: string;
      facilityName: string;
      referralCount: number;
      totalBonus: number;
    }>(
      `SELECT 
        f.id as "facilityId",
        f.name as "facilityName",
        COUNT(r.id) as "referralCount",
        COALESCE(SUM(r.referral_bonus_amount), 0) as "totalBonus"
       FROM facilities f
       LEFT JOIN referrals r ON f.id = r.referring_facility_id AND r.status = 'completed'
       WHERE f.referral_code IS NOT NULL
       GROUP BY f.id, f.name
       HAVING COUNT(r.id) > 0
       ORDER BY COUNT(r.id) DESC, SUM(r.referral_bonus_amount) DESC
       LIMIT 10`
    );
    
    return {
      totalReferrals: parseInt(totalResult.rows[0]?.count?.toString() || "0", 10),
      totalReferralBonuses: parseFloat(totalResult.rows[0]?.referralBonus?.toString() || "0"),
      totalSignupBonuses: parseFloat(totalResult.rows[0]?.signupBonus?.toString() || "0"),
      topReferringFacilities: topFacilitiesResult.rows.map((row) => ({
        facilityId: row.facilityId,
        facilityName: row.facilityName,
        referralCount: parseInt(row.referralCount.toString(), 10),
        totalBonus: parseFloat(row.totalBonus.toString()),
      })),
    };
  } catch (error: any) {
    // Tables don't exist yet (migration not run)
    if (error?.message?.includes("referrals") || error?.message?.includes("does not exist")) {
      return {
        totalReferrals: 0,
        totalReferralBonuses: 0,
        totalSignupBonuses: 0,
        topReferringFacilities: [],
      };
    }
    throw error;
  }
}

// ==================== Patient Management ====================

export async function createPatient(
  facilityId: string,
  patientData: CreatePatientData
): Promise<Patient> {
  const result = await query<Patient>(
    `INSERT INTO patients (
      facility_id, name, age, sex, medical_record_number, phone, email, address,
      primary_diagnosis, comorbidities, medications, allergies
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, facility_id as "facilityId", name, age, sex, medical_record_number as "medicalRecordNumber",
              phone, email, address, primary_diagnosis as "primaryDiagnosis",
              comorbidities, medications, allergies, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      facilityId,
      patientData.name,
      patientData.age,
      patientData.sex,
      patientData.medicalRecordNumber,
      patientData.phone,
      patientData.email,
      patientData.address,
      patientData.primaryDiagnosis,
      patientData.comorbidities || [],
      patientData.medications || [],
      patientData.allergies || [],
    ]
  );
  return result.rows[0];
}

export async function getPatientById(
  patientId: string,
  facilityId: string
): Promise<Patient | null> {
  const result = await query<Patient>(
    `SELECT id, facility_id as "facilityId", name, age, sex, medical_record_number as "medicalRecordNumber",
            phone, email, address, primary_diagnosis as "primaryDiagnosis",
            comorbidities, medications, allergies, created_at as "createdAt", updated_at as "updatedAt"
     FROM patients
     WHERE id = $1 AND facility_id = $2`,
    [patientId, facilityId]
  );
  return result.rows[0] || null;
}

export async function getPatientWithStats(
  patientId: string,
  facilityId: string
): Promise<PatientWithStats | null> {
  const patient = await getPatientById(patientId, facilityId);
  if (!patient) return null;

  const statsResult = await query<{ total_ecgs: number; last_ecg_date: Date | null }>(
    `SELECT 
      COUNT(*) as total_ecgs,
      MAX(created_at) as last_ecg_date
     FROM ecg_reports
     WHERE patient_id = $1 AND facility_id = $2`,
    [patientId, facilityId]
  );

  const stats = statsResult.rows[0];
  return {
    ...patient,
    totalEcgs: parseInt(stats?.total_ecgs?.toString() || "0", 10),
    lastEcgDate: stats?.last_ecg_date || undefined,
  };
}

export async function getPatientsByFacility(
  facilityId: string,
  limit: number = 50,
  offset: number = 0,
  search?: string
): Promise<{ patients: Patient[]; total: number }> {
  let sql = `SELECT id, facility_id as "facilityId", name, age, sex, medical_record_number as "medicalRecordNumber",
                    phone, email, address, primary_diagnosis as "primaryDiagnosis",
                    comorbidities, medications, allergies, created_at as "createdAt", updated_at as "updatedAt"
             FROM patients
             WHERE facility_id = $1`;
  const params: any[] = [facilityId];
  let paramIndex = 2;

  if (search) {
    sql += ` AND (name ILIKE $${paramIndex} OR medical_record_number ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query<Patient>(sql, params);

  // Get total count
  let countSql = `SELECT COUNT(*) as total FROM patients WHERE facility_id = $1`;
  const countParams: any[] = [facilityId];
  if (search) {
    countSql += ` AND (name ILIKE $2 OR medical_record_number ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`;
    countParams.push(`%${search}%`);
  }
  const countResult = await query<{ total: number }>(countSql, countParams);
  const total = parseInt(countResult.rows[0]?.total?.toString() || "0", 10);

  return { patients: result.rows, total };
}

export async function updatePatient(
  patientId: string,
  facilityId: string,
  patientData: UpdatePatientData
): Promise<Patient | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (patientData.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(patientData.name);
  }
  if (patientData.age !== undefined) {
    updates.push(`age = $${paramIndex++}`);
    values.push(patientData.age);
  }
  if (patientData.sex !== undefined) {
    updates.push(`sex = $${paramIndex++}`);
    values.push(patientData.sex);
  }
  if (patientData.medicalRecordNumber !== undefined) {
    updates.push(`medical_record_number = $${paramIndex++}`);
    values.push(patientData.medicalRecordNumber);
  }
  if (patientData.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(patientData.phone);
  }
  if (patientData.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(patientData.email);
  }
  if (patientData.address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    values.push(patientData.address);
  }
  if (patientData.primaryDiagnosis !== undefined) {
    updates.push(`primary_diagnosis = $${paramIndex++}`);
    values.push(patientData.primaryDiagnosis);
  }
  if (patientData.comorbidities !== undefined) {
    updates.push(`comorbidities = $${paramIndex++}`);
    values.push(patientData.comorbidities);
  }
  if (patientData.medications !== undefined) {
    updates.push(`medications = $${paramIndex++}`);
    values.push(patientData.medications);
  }
  if (patientData.allergies !== undefined) {
    updates.push(`allergies = $${paramIndex++}`);
    values.push(patientData.allergies);
  }

  if (updates.length === 0) {
    return getPatientById(patientId, facilityId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(patientId, facilityId);

  const result = await query<Patient>(
    `UPDATE patients
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex} AND facility_id = $${paramIndex + 1}
     RETURNING id, facility_id as "facilityId", name, age, sex, medical_record_number as "medicalRecordNumber",
               phone, email, address, primary_diagnosis as "primaryDiagnosis",
               comorbidities, medications, allergies, created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );

  return result.rows[0] || null;
}

export async function deletePatient(
  patientId: string,
  facilityId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM patients WHERE id = $1 AND facility_id = $2`,
    [patientId, facilityId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getPatientEcgs(
  patientId: string,
  facilityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ reports: EcgStructuredReport[]; total: number }> {
  const result = await query(
    `SELECT * FROM ecg_reports
     WHERE patient_id = $1 AND facility_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [patientId, facilityId, limit, offset]
  );

  const reports = result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at.toISOString(),
    patient: row.patient_info ? JSON.parse(JSON.stringify(row.patient_info)) : undefined,
    patientId: row.patient_id || undefined,
    source: {
      filename: row.source_filename,
      contentType: undefined,
      format: row.source_format,
    },
    signalPreview: row.signal_preview ? JSON.parse(JSON.stringify(row.signal_preview)) : undefined,
    imagePreview: row.image_preview ? JSON.parse(JSON.stringify(row.image_preview)) : undefined,
    measurements: JSON.parse(JSON.stringify(row.measurements)),
    abnormalities: row.abnormalities || [],
    clinicalImpression: row.clinical_impression,
    recommendations: row.recommendations || undefined,
    decisionExplanations: row.decision_explanations ? JSON.parse(JSON.stringify(row.decision_explanations)) : undefined,
    rawAiText: row.raw_ai_text || undefined,
    model: row.model || undefined,
    preprocess: JSON.parse(JSON.stringify(row.preprocess)),
  }));

  const countResult = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM ecg_reports WHERE patient_id = $1 AND facility_id = $2`,
    [patientId, facilityId]
  );
  const total = parseInt(countResult.rows[0]?.total?.toString() || "0", 10);

  return { reports, total };
}

export async function searchPatients(
  facilityId: string,
  searchQuery: string,
  limit: number = 10
): Promise<Patient[]> {
  const result = await query<Patient>(
    `SELECT id, facility_id as "facilityId", name, age, sex, medical_record_number as "medicalRecordNumber",
            phone, email, address, primary_diagnosis as "primaryDiagnosis",
            comorbidities, medications, allergies, created_at as "createdAt", updated_at as "updatedAt"
     FROM patients
     WHERE facility_id = $1
       AND (name ILIKE $2 OR medical_record_number ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
     ORDER BY name
     LIMIT $3`,
    [facilityId, `%${searchQuery}%`, limit]
  );
  return result.rows;
}

