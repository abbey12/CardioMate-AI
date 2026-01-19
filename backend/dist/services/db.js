import { query, getClient } from "../db/connection.js";
// ==================== Admin Queries ====================
export async function createAdmin(email, passwordHash, name) {
    const result = await query(`INSERT INTO admins (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, password_hash as "passwordHash", created_at as "createdAt"`, [email, passwordHash, name || null]);
    return result.rows[0];
}
export async function getAdminByEmail(email) {
    const result = await query(`SELECT id, email, name, password_hash as "passwordHash", created_at as "createdAt"
     FROM admins
     WHERE email = $1`, [email]);
    return result.rows[0] || null;
}
export async function getAdminById(id) {
    const result = await query(`SELECT id, email, name, password_hash as "passwordHash", created_at as "createdAt"
     FROM admins
     WHERE id = $1`, [id]);
    return result.rows[0] || null;
}
// ==================== Facility Queries ====================
export async function createFacility(name, email, passwordHash) {
    const result = await query(`INSERT INTO facilities (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`, [name, email, passwordHash]);
    return result.rows[0];
}
export async function getFacilityByEmail(email) {
    const result = await query(`SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
     FROM facilities
     WHERE email = $1`, [email]);
    return result.rows[0] || null;
}
export async function getFacilityById(id) {
    const result = await query(`SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
     FROM facilities
     WHERE id = $1`, [id]);
    return result.rows[0] || null;
}
export async function getAllFacilities() {
    const result = await query(`SELECT id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
     FROM facilities
     ORDER BY created_at DESC`);
    return result.rows;
}
export async function deleteFacility(id) {
    const result = await query(`DELETE FROM facilities WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
}
export async function updateFacility(id, updates) {
    const updatesList = [];
    const values = [];
    let paramIndex = 1;
    if (updates.name !== undefined) {
        updatesList.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    if (updates.email !== undefined) {
        updatesList.push(`email = $${paramIndex++}`);
        values.push(updates.email);
    }
    if (updatesList.length === 0) {
        return getFacilityById(id);
    }
    updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const result = await query(`UPDATE facilities 
     SET ${updatesList.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, name, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`, values);
    return result.rows[0] || null;
}
export async function updateFacilityPassword(id, passwordHash) {
    const result = await query(`UPDATE facilities 
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`, [passwordHash, id]);
    return (result.rowCount ?? 0) > 0;
}
// ==================== Report Queries ====================
export async function saveReport(report, facilityId) {
    await query(`INSERT INTO ecg_reports (
      id, facility_id, patient_info, measurements, abnormalities, clinical_impression,
      recommendations, decision_explanations, source_format, source_filename,
      signal_preview, image_preview, preprocess, raw_ai_text, model, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (id) DO UPDATE SET
      patient_info = EXCLUDED.patient_info,
      measurements = EXCLUDED.measurements,
      abnormalities = EXCLUDED.abnormalities,
      clinical_impression = EXCLUDED.clinical_impression,
      recommendations = EXCLUDED.recommendations,
      decision_explanations = EXCLUDED.decision_explanations`, [
        report.id,
        facilityId,
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
    ]);
}
export async function getReport(id, facilityId) {
    let sql = `SELECT * FROM ecg_reports WHERE id = $1`;
    const params = [id];
    if (facilityId) {
        sql += ` AND facility_id = $2`;
        params.push(facilityId);
    }
    const result = await query(sql, params);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    return {
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
    };
}
export async function getReportsByFacility(facilityId, limit = 50, offset = 0) {
    const result = await query(`SELECT * FROM ecg_reports
     WHERE facility_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [facilityId, limit, offset]);
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
export async function getAnalyticsSummary(facilityId, fromDate, toDate) {
    let dateFilter = "";
    const params = [facilityId];
    if (fromDate || toDate) {
        const conditions = [];
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
export async function getVolumeData(facilityId, period = "daily", fromDate, toDate) {
    let dateFilter = "";
    const params = [facilityId];
    if (fromDate || toDate) {
        const conditions = [];
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
    let dateFormat;
    let interval;
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
export async function getAbnormalityDistribution(facilityId, fromDate, toDate, limit = 10) {
    let dateFilter = "";
    const params = [facilityId];
    if (fromDate || toDate) {
        const conditions = [];
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
export async function getDemographicsData(facilityId, fromDate, toDate) {
    let dateFilter = "";
    const params = [facilityId];
    if (fromDate || toDate) {
        const conditions = [];
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
// Initialize wallet for facility (called when facility is created)
export async function initializeFacilityWallet(facilityId) {
    const result = await query(`INSERT INTO facility_wallets (facility_id, balance, currency)
     VALUES ($1, 0.00, 'GHS')
     ON CONFLICT (facility_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"`, [facilityId]);
    return result.rows[0];
}
// Get facility wallet
export async function getFacilityWallet(facilityId) {
    const result = await query(`SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
     FROM facility_wallets
     WHERE facility_id = $1`, [facilityId]);
    if (result.rows.length === 0) {
        // Initialize wallet if it doesn't exist
        return await initializeFacilityWallet(facilityId);
    }
    return result.rows[0];
}
// Check if facility has sufficient balance
export async function checkSufficientBalance(facilityId, amount) {
    const wallet = await getFacilityWallet(facilityId);
    if (!wallet)
        return false;
    return wallet.balance >= amount;
}
// Deduct amount from wallet (atomic operation)
export async function deductFromWallet(facilityId, amount, description, referenceId, metadata) {
    const client = await getClient();
    try {
        await client.query("BEGIN");
        // Get current balance with row lock
        const walletResult = await client.query(`SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`, [facilityId]);
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
        await client.query(`UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`, [balanceAfter, facilityId]);
        // Create transaction record
        const transactionResult = await client.query(`INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'deduction', $2, $3, $4, $5, $6, 'completed', $7)
      RETURNING 
        id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
        balance_after as "balanceAfter", description, reference_id as "referenceId",
        status, metadata, created_at as "createdAt"`, [facilityId, amount, balanceBefore, balanceAfter, description, referenceId || null, metadata ? JSON.stringify(metadata) : null]);
        await client.query("COMMIT");
        client.release();
        return { success: true, transaction: transactionResult.rows[0] };
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        client.release();
        return { success: false, error: error?.message || "Failed to deduct from wallet" };
    }
}
// Add funds to wallet (for top-ups)
export async function addToWallet(facilityId, amount, description, referenceId, metadata) {
    const client = await getClient();
    try {
        // Ensure wallet exists
        await getFacilityWallet(facilityId);
        await client.query("BEGIN");
        // Get current balance with row lock
        const walletResult = await client.query(`SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`, [facilityId]);
        if (walletResult.rows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            return { success: false, error: "Wallet not found" };
        }
        const wallet = walletResult.rows[0];
        const balanceBefore = parseFloat(wallet.balance.toString());
        const balanceAfter = balanceBefore + amount;
        // Update wallet balance
        await client.query(`UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`, [balanceAfter, facilityId]);
        // Create transaction record
        const transactionResult = await client.query(`INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'topup', $2, $3, $4, $5, $6, 'completed', $7)
      RETURNING 
        id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
        balance_after as "balanceAfter", description, reference_id as "referenceId",
        status, metadata, created_at as "createdAt"`, [facilityId, amount, balanceBefore, balanceAfter, description, referenceId || null, metadata ? JSON.stringify(metadata) : null]);
        await client.query("COMMIT");
        client.release();
        return { success: true, transaction: transactionResult.rows[0] };
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        client.release();
        return { success: false, error: error?.message || "Failed to add to wallet" };
    }
}
// Get transaction history
export async function getWalletTransactions(facilityId, limit = 50, offset = 0, fromDate, toDate) {
    let dateFilter = "";
    const params = [facilityId];
    if (fromDate || toDate) {
        const conditions = [];
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
    const countResult = await query(`SELECT COUNT(*) as total
     FROM wallet_transactions
     WHERE facility_id = $1 ${dateFilter}`, params);
    const total = parseInt(countResult.rows[0]?.total || "0");
    // Get transactions
    const result = await query(`SELECT 
      id, facility_id as "facilityId", type, amount, balance_before as "balanceBefore",
      balance_after as "balanceAfter", description, reference_id as "referenceId",
      status, metadata, created_at as "createdAt"
     FROM wallet_transactions
     WHERE facility_id = $1 ${dateFilter}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
    return {
        transactions: result.rows.map((row) => ({
            ...row,
            metadata: row.metadata ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) : undefined,
        })),
        total,
    };
}
// Get pricing configuration
export async function getPricingConfig() {
    const result = await query(`SELECT 
      id, analysis_type as "analysisType", price_per_analysis as "pricePerAnalysis",
      currency, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM pricing_config
     WHERE is_active = true
     ORDER BY analysis_type`);
    return result.rows;
}
// Get price for analysis type
export async function getAnalysisPrice(analysisType = "standard") {
    const type = analysisType === "image" ? "image" : "standard";
    const result = await query(`SELECT price_per_analysis as "pricePerAnalysis"
     FROM pricing_config
     WHERE analysis_type = $1 AND is_active = true
     LIMIT 1`, [type]);
    if (result.rows.length === 0) {
        // Default pricing if not configured
        return analysisType === "image" ? 2.0 : 1.0;
    }
    return parseFloat(result.rows[0].pricePerAnalysis.toString());
}
// Create top-up record
export async function createTopUp(facilityId, amount, paystackReference) {
    const result = await query(`INSERT INTO topups (
      facility_id, amount_requested_cedis, paystack_reference, status
    ) VALUES ($1, $2, $3, 'pending')
    RETURNING 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"`, [facilityId, amount, paystackReference]);
    return result.rows[0];
}
// Get top-up by reference
export async function getTopUpByReference(paystackReference) {
    const result = await query(`SELECT 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     WHERE paystack_reference = $1`, [paystackReference]);
    return result.rows.length > 0 ? result.rows[0] : null;
}
// Verify top-up (mark as verified and update wallet)
export async function verifyTopUp(paystackReference, amountReceived) {
    const client = await getClient();
    try {
        await client.query("BEGIN");
        // Get top-up with lock
        const topUpResult = await client.query(`SELECT 
        id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
        amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
        created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
       FROM topups
       WHERE paystack_reference = $1
       FOR UPDATE`, [paystackReference]);
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
        await client.query(`UPDATE topups
       SET status = 'verified',
           amount_received_cedis = $1,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE paystack_reference = $2`, [amountReceived, paystackReference]);
        // Get wallet with lock
        const walletResult = await client.query(`SELECT id, facility_id as "facilityId", balance, currency, created_at as "createdAt", updated_at as "updatedAt"
       FROM facility_wallets
       WHERE facility_id = $1
       FOR UPDATE`, [topUp.facilityId]);
        if (walletResult.rows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            return { success: false, error: "Wallet not found" };
        }
        const wallet = walletResult.rows[0];
        const balanceBefore = parseFloat(wallet.balance.toString());
        const balanceAfter = balanceBefore + amountReceived;
        // Update wallet balance
        await client.query(`UPDATE facility_wallets
       SET balance = $1, updated_at = NOW()
       WHERE facility_id = $2`, [balanceAfter, topUp.facilityId]);
        // Create transaction record
        await client.query(`INSERT INTO wallet_transactions (
        facility_id, type, amount, balance_before, balance_after,
        description, reference_id, status, metadata
      ) VALUES ($1, 'topup', $2, $3, $4, $5, $6, 'completed', $7)`, [
            topUp.facilityId,
            amountReceived,
            balanceBefore,
            balanceAfter,
            `Wallet Top-Up via Paystack`,
            paystackReference,
            JSON.stringify({ paystackReference, topUpId: topUp.id }),
        ]);
        await client.query("COMMIT");
        client.release();
        // Get updated top-up
        const updatedTopUp = await getTopUpByReference(paystackReference);
        return { success: true, topUp: updatedTopUp };
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        client.release();
        return { success: false, error: error?.message || "Failed to verify top-up" };
    }
}
// Mark top-up as failed
export async function markTopUpFailed(paystackReference, reason) {
    await query(`UPDATE topups
     SET status = 'failed', updated_at = NOW()
     WHERE paystack_reference = $1`, [paystackReference]);
}
// Get top-ups for facility
export async function getFacilityTopUps(facilityId, limit = 50, offset = 0) {
    const countResult = await query(`SELECT COUNT(*) as total FROM topups WHERE facility_id = $1`, [facilityId]);
    const total = parseInt(countResult.rows[0]?.total || "0");
    const result = await query(`SELECT 
      id, facility_id as "facilityId", amount_requested_cedis as "amountRequested",
      amount_received_cedis as "amountReceived", status, paystack_reference as "paystackReference",
      created_at as "createdAt", updated_at as "updatedAt", verified_at as "verifiedAt"
     FROM topups
     WHERE facility_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [facilityId, limit, offset]);
    return {
        topUps: result.rows,
        total,
    };
}
// Initialize default pricing (call this on first setup)
export async function initializeDefaultPricing() {
    // Check if pricing exists
    const existing = await query(`SELECT COUNT(*) as count FROM pricing_config`);
    if (parseInt(existing.rows[0]?.count || "0") > 0) {
        return; // Pricing already initialized
    }
    // Insert default pricing (Ghana Cedis)
    await query(`INSERT INTO pricing_config (analysis_type, price_per_analysis, currency, is_active)
     VALUES 
       ('standard', 5.00, 'GHS', true),
       ('image', 10.00, 'GHS', true)
     ON CONFLICT DO NOTHING`);
}
export async function getAllReports(limit = 50, offset = 0) {
    const result = await query(`SELECT * FROM ecg_reports
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`, [limit, offset]);
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
export async function getReportCount(facilityId) {
    let sql = `SELECT COUNT(*) as count FROM ecg_reports`;
    const params = [];
    if (facilityId) {
        sql += ` WHERE facility_id = $1`;
        params.push(facilityId);
    }
    const result = await query(sql, params);
    return parseInt(result.rows[0].count, 10);
}
