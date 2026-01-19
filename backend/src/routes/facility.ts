import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { EcgStructuredReport, PatientInfo } from "../types/ecg.js";
import {
  detectFormat,
  parseEcgFromCsv,
  parseEcgFromJson
} from "../utils/ecgParse.js";
import { preprocessEcg } from "../utils/ecgPreprocess.js";
import { interpretEcgImageWithGemini, interpretWithGemini } from "../services/gemini.js";
import { translateEcgReport } from "../services/translate.js";
import { generateEcgReportPdf } from "../services/pdf.js";
import { saveReport, getReport, getReportsByFacility, getReportCount, updateFacility, updateFacilityPassword, getFacilityById, getAnalyticsSummary, getVolumeData, getAbnormalityDistribution, getDemographicsData, getFacilityWallet, checkSufficientBalance, deductFromWallet, getAnalysisPrice, getWalletTransactions, addToWallet, initializeDefaultPricing, createTopUp, verifyTopUp, getTopUpByReference, markTopUpFailed, getFacilityTopUps, cancelTopUp, getTopUpById, getFacilityReferralCode, getFacilityReferralStats, logSystemEvent, getCountryPricing, createPatient, getPatientById, getPatientsByFacility, getPatientWithStats, updatePatient, deletePatient, getPatientEcgs, searchPatients, getPlatformSetting } from "../services/db.js";
import type { CreatePatientData, UpdatePatientData } from "../types/patient.js";
import { query } from "../db/connection.js";
import { initializeTopUp, verifyTransaction, pesewasToGhs } from "../services/paystack.js";
import { requireFacility } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";

const facilityRouter = express.Router();

// All facility routes require authentication
facilityRouter.use(requireFacility);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

const UploadQuerySchema = z.object({
  sampleRateHz: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 0), {
      message: "sampleRateHz must be a positive number"
    })
});

const PatientInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(0).max(150, "Age must be between 0 and 150"),
  sex: z.enum(["male", "female", "other", "unknown"]),
  medicalRecordNumber: z.string().optional(),
  clinicalIndication: z.string().optional(),
  medications: z.array(z.string()).optional(),
  priorEcgDate: z.string().optional()
}).optional();

// ==================== Dashboard ====================

facilityRouter.get("/dashboard", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const totalReports = await getReportCount(facilityId);
    const recentReports = await getReportsByFacility(facilityId, 5, 0);
    
    res.json({
      totalReports,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        patientName: r.patient?.name,
        heartRate: r.measurements.heartRateBpm,
        rhythm: r.measurements.rhythm,
        abnormalities: r.abnormalities.length,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch dashboard data" });
  }
});

// ==================== Reports ====================

facilityRouter.get("/reports", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    
    let reports = await getReportsByFacility(facilityId, limit * 10, 0); // Get more to filter
    
    // Apply date filtering if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      reports = reports.filter((report) => {
        const reportDate = new Date(report.createdAt);
        if (from && reportDate < from) return false;
        if (to) {
          const toDateEnd = new Date(to);
          toDateEnd.setHours(23, 59, 59, 999);
          if (reportDate > toDateEnd) return false;
        }
        return true;
      });
    }
    
    // Apply pagination after filtering
    const paginatedReports = reports.slice(offset, offset + limit);
    const totalCount = reports.length;
    
    res.json({
      reports: paginatedReports,
      total: totalCount,
      limit,
      offset,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch reports" });
  }
});

facilityRouter.get("/reports/:id", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const report = await getReport(req.params.id, facilityId);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    // Get facility's preferred language
    const facility = await getFacilityById(facilityId);
    let targetLanguage: "en" | "fr" = "en";
    
    console.log("Facility preferredLanguage:", facility?.preferredLanguage);
    
    if (facility?.preferredLanguage === "fr") {
      targetLanguage = "fr";
      console.log("Using facility's preferred language: French");
    } else {
      // Fallback to platform default
      try {
        const languageSetting = await getPlatformSetting("default_language");
        console.log("Platform default language setting:", languageSetting?.settingValue);
        if (languageSetting?.settingValue && typeof languageSetting.settingValue === "object" && "language" in languageSetting.settingValue) {
          const lang = (languageSetting.settingValue as { language: string }).language;
          if (lang === "fr") {
            targetLanguage = "fr";
            console.log("Using platform default language: French");
          }
        }
      } catch (err) {
        console.error("Failed to fetch language setting:", err);
      }
    }

    console.log("Final target language:", targetLanguage);

    // Translate report if target language is French
    if (targetLanguage === "fr") {
      console.log("Facility preferred language is French - translating report...");
      console.log("Report content to translate:", {
        clinicalImpression: report.clinicalImpression?.substring(0, 100),
        abnormalitiesCount: report.abnormalities?.length || 0,
        recommendationsCount: report.recommendations?.length || 0,
        rhythm: report.measurements.rhythm,
      });
      try {
        const translated = await translateEcgReport(
          {
            clinicalImpression: report.clinicalImpression,
            abnormalities: report.abnormalities || [],
            recommendations: report.recommendations,
            rhythm: report.measurements.rhythm || null,
          },
          "fr"
        );

        console.log("Translation completed. Returning translated report.");
        // Return report with translated content
        res.json({
          ...report,
          clinicalImpression: translated.clinicalImpression,
          abnormalities: translated.abnormalities,
          recommendations: translated.recommendations,
          measurements: {
            ...report.measurements,
            rhythm: translated.rhythm || report.measurements.rhythm,
          },
        });
        return;
      } catch (translateErr) {
        console.error("Translation error in route handler:", translateErr);
        console.error("Error stack:", (translateErr as Error)?.stack);
        // If translation fails, return original report
      }
    } else {
      console.log("Target language is English - returning original report");
    }

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch report" });
  }
});

facilityRouter.get("/reports/export/csv", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    
    let reports = await getReportsByFacility(facilityId, 10000, 0); // Get all reports
    
    // Apply date filtering if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      reports = reports.filter((report) => {
        const reportDate = new Date(report.createdAt);
        if (from && reportDate < from) return false;
        if (to) {
          const toDateEnd = new Date(to);
          toDateEnd.setHours(23, 59, 59, 999);
          if (reportDate > toDateEnd) return false;
        }
        return true;
      });
    }
    
    // Generate CSV
    const headers = [
      "Report ID",
      "Date",
      "Patient Name",
      "MRN",
      "Heart Rate (bpm)",
      "Rhythm",
      "PR (ms)",
      "QRS (ms)",
      "QT (ms)",
      "QTc (ms)",
      "Abnormalities",
      "Clinical Impression",
    ];
    
    const rows = reports.map((r) => [
      r.id,
      new Date(r.createdAt).toISOString().split("T")[0],
      r.patient?.name || "",
      r.patient?.medicalRecordNumber || "",
      r.measurements.heartRateBpm || "",
      r.measurements.rhythm || "",
      r.measurements.prMs || "",
      r.measurements.qrsMs || "",
      r.measurements.qtMs || "",
      r.measurements.qtcMs || "",
      r.abnormalities?.join("; ") || "",
      r.clinicalImpression?.replace(/\n/g, " ") || "",
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    
    const filename = `ECG_Reports_${new Date().toISOString().split("T")[0]}.csv`;
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to export reports" });
  }
});

facilityRouter.get("/reports/:id/download", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    let report = await getReport(req.params.id, facilityId);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    // Get facility's preferred language for PDF
    const facility = await getFacilityById(facilityId);
    let targetLanguage: "en" | "fr" = "en";
    
    if (facility?.preferredLanguage === "fr") {
      targetLanguage = "fr";
    } else {
      // Fallback to platform default
      try {
        const languageSetting = await getPlatformSetting("default_language");
        if (languageSetting?.settingValue && typeof languageSetting.settingValue === "object" && "language" in languageSetting.settingValue) {
          const lang = (languageSetting.settingValue as { language: string }).language;
          if (lang === "fr") {
            targetLanguage = "fr";
          }
        }
      } catch (err) {
        console.error("Failed to fetch language setting:", err);
      }
    }

    // Translate report if target language is French
    if (targetLanguage === "fr") {
      try {
        const translated = await translateEcgReport(
          {
            clinicalImpression: report.clinicalImpression,
            abnormalities: report.abnormalities || [],
            recommendations: report.recommendations,
            rhythm: report.measurements.rhythm || null,
          },
          "fr"
        );

        // Create translated report for PDF
        report = {
          ...report,
          clinicalImpression: translated.clinicalImpression,
          abnormalities: translated.abnormalities,
          recommendations: translated.recommendations,
          measurements: {
            ...report.measurements,
            rhythm: translated.rhythm || report.measurements.rhythm,
          },
        };
      } catch (translateErr) {
        console.error("Translation error for PDF:", translateErr);
        // If translation fails, use original report
      }
    }

    const pdfBuffer = await generateEcgReportPdf(report);
    const filename = `ECG_Report_${report.id}_${new Date(report.createdAt).toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("PDF generation error:", err);
    res.status(500).json({ 
      error: "Failed to generate PDF report",
      details: err?.message 
    });
  }
});

// ==================== Upload ECG ====================

facilityRouter.post(
  "/reports/upload",
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      const facilityId = req.facilityId!;
      const q = UploadQuerySchema.parse(req.query);
      const sampleRateHz = q.sampleRateHz ?? 250;

      // Parse patient_id or patient info from request body
      let patientId: string | undefined;
      let patientInfo: PatientInfo | undefined;
      
      // Check if patient_id is provided (existing patient)
      if (req.body.patientId) {
        patientId = req.body.patientId;
        // Verify patient exists and belongs to facility
        const patient = await getPatientById(patientId, facilityId);
        if (!patient) {
          res.status(404).json({ error: "Patient not found" });
          return;
        }
        // Use patient data for AI context
        patientInfo = {
          name: patient.name,
          age: patient.age ?? undefined,
          sex: patient.sex ?? "unknown",
          medicalRecordNumber: patient.medicalRecordNumber ?? undefined,
        };
      } else if (req.body.patient) {
        // New patient data provided
        try {
          const parsed = typeof req.body.patient === "string" 
            ? JSON.parse(req.body.patient) 
            : req.body.patient;
          patientInfo = PatientInfoSchema.parse(parsed);
        } catch (err: any) {
          res.status(400).json({ 
            error: "Invalid patient information format",
            details: err?.message 
          });
          return;
        }
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Missing multipart field 'file'." });
        return;
      }

      const format =
        detectFormat(file.originalname, file.mimetype) ??
        (() => {
          res.status(400).json({
            error:
              "Unsupported file type. Please upload .csv, .json, .png, .jpg, or .jpeg."
          });
          return undefined;
        })();
      if (!format) return;

      // Determine analysis type and price (country-specific)
      const analysisType = format === "image" ? "image" : "standard";
      const facility = await getFacilityById(facilityId);
      const analysisPrice = await getAnalysisPrice(analysisType, facility?.country || undefined);
      const hasSufficientBalance = await checkSufficientBalance(facilityId, analysisPrice);

      if (!hasSufficientBalance) {
        const wallet = await getFacilityWallet(facilityId);
        res.status(402).json({
          error: "Insufficient balance",
          message: `You need $${analysisPrice.toFixed(2)} to perform this analysis. Your current balance is $${wallet?.balance.toFixed(2) || "0.00"}.`,
          requiredAmount: analysisPrice,
          currentBalance: wallet?.balance || 0,
        });
        return;
      }

      // Fetch prior ECGs if patientId is provided
      let priorEcgs: Array<{
        id: string;
        createdAt: string;
        measurements: {
          heartRateBpm?: number;
          rhythm?: string;
          prMs?: number;
          qrsMs?: number;
          qtMs?: number;
          qtcMs?: number;
        };
        abnormalities: string[];
        clinicalImpression: string;
      }> = [];
      
      if (patientId) {
        try {
          const priorEcgsData = await getPatientEcgs(patientId, facilityId, 5, 0); // Get last 5 ECGs
          priorEcgs = priorEcgsData.reports.map((ecg) => ({
            id: ecg.id,
            createdAt: ecg.createdAt,
            measurements: ecg.measurements,
            abnormalities: ecg.abnormalities || [],
            clinicalImpression: ecg.clinicalImpression,
          }));
        } catch (err) {
          console.error("Failed to fetch prior ECGs:", err);
          // Continue without prior ECGs if fetch fails
        }
      }

      // Get language preference: facility's preferred language, fallback to platform default, then "en"
      let language = "en"; // Default to English
      try {
        // First, try facility's preferred language
        if (facility?.preferredLanguage) {
          language = facility.preferredLanguage;
        } else {
          // Fallback to platform default
          const languageSetting = await getPlatformSetting("default_language");
          if (languageSetting?.settingValue && typeof languageSetting.settingValue === "object" && "language" in languageSetting.settingValue) {
            language = (languageSetting.settingValue as { language: string }).language || "en";
          }
        }
      } catch (err) {
        console.error("Failed to fetch language setting:", err);
        // Continue with default "en"
      }

      if (format === "image") {
        const mimeType =
          file.mimetype && file.mimetype.startsWith("image/")
            ? file.mimetype
            : "image/jpeg";
        const imageBase64 = file.buffer.toString("base64");

        const ai = await interpretEcgImageWithGemini({ 
          imageBase64, 
          mimeType, 
          patient: patientInfo,
          priorEcgs: priorEcgs.length > 0 ? priorEcgs : undefined,
          language
        });

        const id = nanoid();
        const report: EcgStructuredReport = {
          id,
          createdAt: new Date().toISOString(),
          patient: patientInfo,
          source: {
            filename: file.originalname,
            contentType: file.mimetype,
            format
          },
          imagePreview: {
            mimeType,
            base64: imageBase64
          },
          measurements: {
            heartRateBpm: ai.structured.measurements.heartRateBpm,
            rhythm: ai.structured.measurements.rhythm,
            prMs: ai.structured.measurements.prMs,
            qrsMs: ai.structured.measurements.qrsMs,
            qtMs: ai.structured.measurements.qtMs,
            qtcMs: ai.structured.measurements.qtcMs
          },
          abnormalities: ai.structured.abnormalities ?? [],
          clinicalImpression: ai.structured.clinicalImpression,
          recommendations: ai.structured.recommendations,
          decisionExplanations: ai.structured.decisionExplanations,
          rawAiText: ai.rawText,
          model: ai.model,
          preprocess: {
            sampleRateHz: 0,
            sampleCount: 0,
            durationSec: 0,
            mean: 0,
            std: 0,
            min: 0,
            max: 0,
            rPeakIndices: []
          }
        };

        await saveReport(report, facilityId, patientId);
        
        // Deduct from wallet after successful analysis
        const deduction = await deductFromWallet(
          facilityId,
          analysisPrice,
          `AI Analysis - Image ECG`,
          id,
          { reportId: id, format, analysisType: "image" }
        );

        if (!deduction.success) {
          console.error("Failed to deduct from wallet after analysis:", deduction.error);
          // Report is already saved, but transaction failed - this should be logged and handled
        }

        res.json(report);
        return;
      }

      const text = file.buffer.toString("utf8");
      const signal =
        format === "csv"
          ? parseEcgFromCsv(text, sampleRateHz)
          : parseEcgFromJson(text);

      const { cleaned, normalized, summary } = preprocessEcg(signal);

      const ai = await interpretWithGemini({ 
        signal, 
        preprocess: summary, 
        patient: patientInfo,
        priorEcgs: priorEcgs.length > 0 ? priorEcgs : undefined,
        language
      });

      const id = nanoid();
      const report: EcgStructuredReport = {
        id,
        createdAt: new Date().toISOString(),
        patient: patientInfo,
        source: {
          filename: file.originalname,
          contentType: file.mimetype,
          format
        },
        signalPreview: {
          cleaned: cleaned.slice(0, 2000),
          normalized: normalized.slice(0, 2000)
        },
        measurements: {
          heartRateBpm:
            ai.structured.measurements.heartRateBpm ??
            summary.estimatedHeartRateBpm,
          rhythm: ai.structured.measurements.rhythm,
          prMs: ai.structured.measurements.prMs,
          qrsMs: ai.structured.measurements.qrsMs,
          qtMs: ai.structured.measurements.qtMs,
          qtcMs: ai.structured.measurements.qtcMs
        },
        abnormalities: ai.structured.abnormalities ?? [],
        clinicalImpression: ai.structured.clinicalImpression,
        recommendations: ai.structured.recommendations,
        decisionExplanations: ai.structured.decisionExplanations,
        rawAiText: ai.rawText,
        model: ai.model,
        preprocess: summary
      };

      await saveReport(report, facilityId, patientId);

      // Deduct from wallet after successful analysis
      const deduction = await deductFromWallet(
        facilityId,
        analysisPrice,
        `AI Analysis - Signal ECG`,
        id,
        { reportId: id, format, analysisType: "standard" }
      );

      if (!deduction.success) {
        console.error("Failed to deduct from wallet after analysis:", deduction.error);
        // Report is already saved, but transaction failed - this should be logged and handled
      }

      res.json(report);
    } catch (err: any) {
      const message = err?.message ?? "Unknown error";
      await logSystemEvent({
        eventType: "ai_error",
        message: "ECG analysis failed",
        context: { facilityId, error: message },
      });
      res.status(400).json({ error: message });
    }
  }
);

// ==================== Settings ====================

const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).nullable().optional(),
  addressLine1: z.string().min(2).nullable().optional(),
  addressLine2: z.string().min(2).nullable().optional(),
  city: z.string().min(2).nullable().optional(),
  country: z.string().min(2).nullable().optional(),
  facilityType: z.string().min(2).nullable().optional(),
  contactName: z.string().min(2).nullable().optional(),
  contactPhone: z.string().min(3).nullable().optional(),
  website: z.string().url().nullable().optional(),
  preferredLanguage: z.enum(["en", "fr"]).nullable().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

facilityRouter.patch("/profile", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const data = UpdateProfileSchema.parse(req.body);

    const normalize = (value?: string | null) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    const normalized = {
      ...data,
      name: normalize(data.name),
      email: normalize(data.email),
      phone: normalize(data.phone),
      addressLine1: normalize(data.addressLine1),
      addressLine2: normalize(data.addressLine2),
      city: normalize(data.city),
      country: normalize(data.country),
      facilityType: normalize(data.facilityType),
      contactName: normalize(data.contactName),
      contactPhone: normalize(data.contactPhone),
      website: normalize(data.website),
      preferredLanguage: data.preferredLanguage !== undefined ? data.preferredLanguage : undefined,
    };

    if (Object.keys(normalized).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const current = await getFacilityById(facilityId);
    if (!current) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    const merged = {
      ...current,
      ...normalized,
    };

    const requiredComplete =
      !!merged.name &&
      !!merged.email &&
      !!merged.phone &&
      !!merged.addressLine1 &&
      !!merged.city &&
      !!merged.country &&
      !!merged.facilityType &&
      !!merged.contactName &&
      !!merged.contactPhone;

    const updated = await updateFacility(facilityId, {
      ...normalized,
      signupCompletedAt: requiredComplete && !current.signupCompletedAt ? new Date() : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    res.json({
      facility: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? null,
        addressLine1: updated.addressLine1 ?? null,
        addressLine2: updated.addressLine2 ?? null,
        city: updated.city ?? null,
        country: updated.country ?? null,
        facilityType: updated.facilityType ?? null,
        contactName: updated.contactName ?? null,
        contactPhone: updated.contactPhone ?? null,
        website: updated.website ?? null,
        preferredLanguage: updated.preferredLanguage ?? null,
        signupCompletedAt: updated.signupCompletedAt ?? null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update profile" });
  }
});

facilityRouter.patch("/password", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const data = ChangePasswordSchema.parse(req.body);

    const facility = await getFacilityById(facilityId);
    if (!facility) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    const isValid = await verifyPassword(data.currentPassword, facility.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const newPasswordHash = await hashPassword(data.newPassword);
    await updateFacilityPassword(facilityId, newPasswordHash);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update password" });
  }
});

facilityRouter.get("/profile", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const facility = await getFacilityById(facilityId);
    if (!facility) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    res.json({
      facility: {
        id: facility.id,
        name: facility.name,
        email: facility.email,
        phone: facility.phone ?? null,
        addressLine1: facility.addressLine1 ?? null,
        addressLine2: facility.addressLine2 ?? null,
        city: facility.city ?? null,
        country: facility.country ?? null,
        facilityType: facility.facilityType ?? null,
        contactName: facility.contactName ?? null,
        contactPhone: facility.contactPhone ?? null,
        website: facility.website ?? null,
        preferredLanguage: facility.preferredLanguage ?? null,
        signupCompletedAt: facility.signupCompletedAt ?? null,
        createdAt: facility.createdAt,
        updatedAt: facility.updatedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch profile" });
  }
});

// ==================== Analytics ====================

facilityRouter.get("/analytics/summary", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const summary = await getAnalyticsSummary(facilityId, fromDate, toDate);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch analytics summary" });
  }
});

facilityRouter.get("/analytics/volume", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const period = (req.query.period as "daily" | "weekly" | "monthly") || "daily";
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const volumeData = await getVolumeData(facilityId, period, fromDate, toDate);
    res.json(volumeData);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch volume data" });
  }
});

facilityRouter.get("/analytics/abnormalities", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const distribution = await getAbnormalityDistribution(facilityId, fromDate, toDate, limit);
    res.json(distribution);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch abnormality distribution" });
  }
});

facilityRouter.get("/analytics/demographics", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const demographics = await getDemographicsData(facilityId, fromDate, toDate);
    res.json(demographics);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch demographics data" });
  }
});

// ==================== Wallet Management ====================

facilityRouter.get("/wallet", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const wallet = await getFacilityWallet(facilityId);
    
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    res.json({
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      updatedAt: wallet.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch wallet" });
  }
});

facilityRouter.get("/wallet/transactions", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;

    const result = await getWalletTransactions(facilityId, limit, offset, fromDate, toDate);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch transactions" });
  }
});

facilityRouter.get("/pricing", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const facility = await getFacilityById(facilityId);
    const country = facility?.country || undefined;
    
    const pricing = await getAnalysisPrice("standard", country);
    const imagePricing = await getAnalysisPrice("image", country);
    
    // Get currency from country pricing or default to GHS
    let currency = "GHS";
    if (country) {
      const countryPricing = await getCountryPricing(country);
      if (countryPricing.length > 0) {
        currency = countryPricing[0].currency;
      }
    }
    
    res.json({
      standard: pricing,
      image: imagePricing,
      currency: currency,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch pricing" });
  }
});

// Initialize Paystack top-up
facilityRouter.post("/wallet/topup/initialize", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const { amount } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Invalid amount. Must be a positive number." });
      return;
    }

    // Minimum top-up amount: ₵100.00, Maximum: ₵500.00
    if (amount < 100) {
      res.status(400).json({ error: "Minimum top-up amount is ₵100.00" });
      return;
    }
    if (amount > 500) {
      res.status(400).json({ error: "Maximum top-up amount is ₵500.00" });
      return;
    }

    // Get facility details
    const facility = await getFacilityById(facilityId);
    if (!facility) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    // Ensure facility has required fields
    if (!facility.email) {
      res.status(400).json({ error: "Facility email is required for payment" });
      return;
    }

    // Initialize Paystack transaction
    const paystackResponse = await initializeTopUp(amount, facility, {
      topup_type: "wallet",
    });

    // Create top-up record
    const topUp = await createTopUp(
      facilityId,
      amount,
      paystackResponse.data.reference
    );

    res.json({
      success: true,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
      topUpId: topUp.id,
    });
  } catch (err: any) {
    console.error("Top-up initialization error:", err);
    console.error("Error stack:", err?.stack);
    const errorMessage = err?.message || "Failed to initialize top-up";
    console.error("Error message:", errorMessage);
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

// Verify top-up (manual verification endpoint - webhook is preferred)
facilityRouter.post("/wallet/topup/verify", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const { reference } = req.body;

    if (!reference || typeof reference !== "string") {
      res.status(400).json({ error: "Payment reference is required" });
      return;
    }

    // Get top-up record
    const topUp = await getTopUpByReference(reference);
    if (!topUp) {
      res.status(404).json({ error: "Top-up not found" });
      return;
    }

    // Verify facility owns this top-up
    if (topUp.facilityId !== facilityId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Verify with Paystack
    const verification = await verifyTransaction(reference);

    if (verification.status && verification.data.status === "success") {
      const amountReceived = pesewasToGhs(verification.data.amount);
      
      // Verify and update wallet
      const result = await verifyTopUp(reference, amountReceived);
      
      if (result.success) {
        const wallet = await getFacilityWallet(facilityId);
        res.json({
          success: true,
          topUp: result.topUp,
          newBalance: parseFloat(wallet!.balance.toString()),
        });
      } else {
        res.status(400).json({ error: result.error || "Failed to verify top-up" });
      }
    } else {
      // Payment failed
      await markTopUpFailed(reference, verification.message);
      res.status(400).json({ 
        error: "Payment verification failed",
        message: verification.message 
      });
    }
  } catch (err: any) {
    console.error("Top-up verification error:", err);
    res.status(500).json({ error: err?.message || "Failed to verify top-up" });
  }
});

// Get top-up history
facilityRouter.get("/wallet/topups", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const result = await getFacilityTopUps(facilityId, limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch top-ups" });
  }
});

// Cancel pending top-up
facilityRouter.delete("/wallet/topups/:topUpId", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const { topUpId } = req.params;

    const result = await cancelTopUp(topUpId, facilityId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error || "Failed to cancel top-up" });
      return;
    }

    res.json({ success: true, message: "Top-up cancelled successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to cancel top-up" });
  }
});

// Retry payment for pending top-up
facilityRouter.post("/wallet/topups/:topUpId/retry", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const { topUpId } = req.params;

    const topUp = await getTopUpById(topUpId);
    
    if (!topUp) {
      res.status(404).json({ error: "Top-up not found" });
      return;
    }

    if (topUp.facilityId !== facilityId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    if (topUp.status !== "pending") {
      res.status(400).json({ error: "Only pending top-ups can be retried" });
      return;
    }

    // Get facility details
    const facility = await getFacilityById(facilityId);
    if (!facility) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }

    // Initialize new Paystack transaction with same amount
    const paystackResponse = await initializeTopUp(topUp.amountRequested, facility, {
      topup_type: "retry",
      original_topup_id: topUpId,
    });

    // Update the top-up with new reference
    await query(
      `UPDATE topups 
       SET paystack_reference = $1, updated_at = NOW()
       WHERE id = $2`,
      [paystackResponse.data.reference, topUpId]
    );

    res.json({
      success: true,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
      topUpId: topUpId,
    });
  } catch (err: any) {
    console.error("Retry top-up error:", err.message, err.stack);
    res.status(500).json({ error: err?.message || "Failed to retry payment" });
  }
});

// Manual top-up endpoint (for admin only - kept for backward compatibility)
facilityRouter.post("/wallet/topup/manual", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const { amount, description } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Invalid amount. Must be a positive number." });
      return;
    }

    const result = await addToWallet(
      facilityId,
      amount,
      description || "Manual Top-Up",
      undefined,
      { method: "manual", initiatedBy: facilityId }
    );

    if (!result.success) {
      res.status(400).json({ error: result.error || "Failed to add funds" });
      return;
    }

    const wallet = await getFacilityWallet(facilityId);
    res.json({
      success: true,
      transaction: result.transaction,
      newBalance: parseFloat(wallet!.balance.toString()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to top up wallet" });
  }
});

// ==================== Referral System ====================

facilityRouter.get("/referral/code", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const referralCode = await getFacilityReferralCode(facilityId);
    res.json({ referralCode });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get referral code" });
  }
});

facilityRouter.get("/referral/stats", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const stats = await getFacilityReferralStats(facilityId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get referral statistics" });
  }
});

// ==================== Patient Management ====================

facilityRouter.get("/patients", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const search = req.query.search as string | undefined;
    
    const result = await getPatientsByFacility(facilityId, limit, offset, search);
    res.json(result);
  } catch (err: any) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ 
      error: err?.message || "Failed to fetch patients",
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

facilityRouter.get("/patients/search", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const query = req.query.q as string;
    const limit = Number(req.query.limit) || 20;
    
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }
    
    const patients = await searchPatients(facilityId, query, limit);
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to search patients" });
  }
});

facilityRouter.get("/patients/:id", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const patientId = req.params.id;
    const includeStats = req.query.stats === "true";
    
    const patient = includeStats
      ? await getPatientWithStats(patientId, facilityId)
      : await getPatientById(patientId, facilityId);
    
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    
    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch patient" });
  }
});

facilityRouter.post("/patients", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const data = CreatePatientDataSchema.parse(req.body);
    
    console.log("Creating patient for facility:", facilityId, "Data:", data);
    const patient = await createPatient(facilityId, data);
    console.log("Patient created successfully:", patient.id, patient.name);
    res.status(201).json(patient);
  } catch (err: any) {
    console.error("Error creating patient:", err);
    if (err.name === "ZodError") {
      res.status(400).json({ error: "Invalid patient data", details: err.errors });
      return;
    }
    if (err?.code === "23505") {
      // Unique constraint violation (MRN)
      res.status(409).json({ error: "A patient with this medical record number already exists" });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to create patient" });
  }
});

facilityRouter.patch("/patients/:id", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const patientId = req.params.id;
    const data = UpdatePatientDataSchema.parse(req.body);
    
    const patient = await updatePatient(patientId, facilityId, data);
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    
    res.json(patient);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: "Invalid patient data", details: err.errors });
      return;
    }
    if (err?.code === "23505") {
      res.status(409).json({ error: "A patient with this medical record number already exists" });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update patient" });
  }
});

facilityRouter.delete("/patients/:id", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const patientId = req.params.id;
    
    const deleted = await deletePatient(patientId, facilityId);
    if (!deleted) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete patient" });
  }
});

facilityRouter.get("/patients/:id/ecgs", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const patientId = req.params.id;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    
    const result = await getPatientEcgs(patientId, facilityId, limit, offset);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch patient ECGs" });
  }
});

// Validation schemas
const CreatePatientDataSchemaBase = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(0).max(150).optional().nullable(),
  sex: z.enum(["male", "female", "other", "unknown"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  medicalRecordNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional().nullable(),
  address: z.string().optional().nullable(),
  primaryDiagnosis: z.string().optional().nullable(),
  comorbidities: z.array(z.string()).optional().nullable(),
  medications: z.array(z.string()).optional().nullable(),
  allergies: z.array(z.string()).optional().nullable(),
});

const CreatePatientDataSchema = CreatePatientDataSchemaBase.transform((data) => ({
  ...data,
  // Convert empty strings to null for optional fields
  medicalRecordNumber: data.medicalRecordNumber?.trim() || null,
  phone: data.phone?.trim() || null,
  email: data.email?.trim() || null,
  address: data.address?.trim() || null,
  primaryDiagnosis: data.primaryDiagnosis?.trim() || null,
}));

const UpdatePatientDataSchema = CreatePatientDataSchemaBase.partial();

// Get prior ECGs for a report (if report is linked to a patient)
facilityRouter.get("/reports/:id/prior-ecgs", async (req, res): Promise<void> => {
  try {
    const facilityId = req.facilityId!;
    const reportId = req.params.id;
    
    // Get the report to find patient_id
    const report = await getReport(reportId, facilityId);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    
    // Get patient_id from report (need to query database directly)
    const reportRow = await query(
      `SELECT patient_id FROM ecg_reports WHERE id = $1 AND facility_id = $2`,
      [reportId, facilityId]
    );
    
    const patientId = reportRow.rows[0]?.patient_id;
    if (!patientId) {
      res.json({ reports: [], total: 0 });
      return;
    }
    
    // Get prior ECGs (excluding current report)
    const result = await getPatientEcgs(patientId, facilityId, 10, 0);
    const priorEcgs = result.reports.filter(ecg => ecg.id !== reportId);
    
    res.json({ reports: priorEcgs, total: priorEcgs.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch prior ECGs" });
  }
});

export { facilityRouter };

