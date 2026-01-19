import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import { detectFormat, parseEcgFromCsv, parseEcgFromJson } from "../utils/ecgParse.js";
import { preprocessEcg } from "../utils/ecgPreprocess.js";
import { interpretEcgImageWithGemini, interpretWithGemini } from "../services/gemini.js";
import { generateEcgReportPdf } from "../services/pdf.js";
import { saveReport, getReport, getReportsByFacility, getReportCount, updateFacility, updateFacilityPassword, getFacilityById, getAnalyticsSummary, getVolumeData, getAbnormalityDistribution, getDemographicsData, getFacilityWallet, checkSufficientBalance, deductFromWallet, getAnalysisPrice, getWalletTransactions, addToWallet, createTopUp, verifyTopUp, getTopUpByReference, markTopUpFailed, getFacilityTopUps } from "../services/db.js";
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
facilityRouter.get("/dashboard", async (req, res) => {
    try {
        const facilityId = req.facilityId;
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
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch dashboard data" });
    }
});
// ==================== Reports ====================
facilityRouter.get("/reports", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        let reports = await getReportsByFacility(facilityId, limit * 10, 0); // Get more to filter
        // Apply date filtering if provided
        if (fromDate || toDate) {
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            reports = reports.filter((report) => {
                const reportDate = new Date(report.createdAt);
                if (from && reportDate < from)
                    return false;
                if (to) {
                    const toDateEnd = new Date(to);
                    toDateEnd.setHours(23, 59, 59, 999);
                    if (reportDate > toDateEnd)
                        return false;
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
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch reports" });
    }
});
facilityRouter.get("/reports/:id", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const report = await getReport(req.params.id, facilityId);
        if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
        }
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch report" });
    }
});
facilityRouter.get("/reports/export/csv", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        let reports = await getReportsByFacility(facilityId, 10000, 0); // Get all reports
        // Apply date filtering if provided
        if (fromDate || toDate) {
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(toDate) : null;
            reports = reports.filter((report) => {
                const reportDate = new Date(report.createdAt);
                if (from && reportDate < from)
                    return false;
                if (to) {
                    const toDateEnd = new Date(to);
                    toDateEnd.setHours(23, 59, 59, 999);
                    if (reportDate > toDateEnd)
                        return false;
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
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to export reports" });
    }
});
facilityRouter.get("/reports/:id/download", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const report = await getReport(req.params.id, facilityId);
        if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
        }
        const pdfBuffer = await generateEcgReportPdf(report);
        const filename = `ECG_Report_${report.id}_${new Date(report.createdAt).toISOString().split("T")[0]}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length.toString());
        res.send(pdfBuffer);
    }
    catch (err) {
        console.error("PDF generation error:", err);
        res.status(500).json({
            error: "Failed to generate PDF report",
            details: err?.message
        });
    }
});
// ==================== Upload ECG ====================
facilityRouter.post("/reports/upload", upload.single("file"), async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const q = UploadQuerySchema.parse(req.query);
        const sampleRateHz = q.sampleRateHz ?? 250;
        // Parse patient info from request body
        let patientInfo;
        if (req.body.patient) {
            try {
                const parsed = typeof req.body.patient === "string"
                    ? JSON.parse(req.body.patient)
                    : req.body.patient;
                patientInfo = PatientInfoSchema.parse(parsed);
            }
            catch (err) {
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
        const format = detectFormat(file.originalname, file.mimetype) ??
            (() => {
                res.status(400).json({
                    error: "Unsupported file type. Please upload .csv, .json, .png, .jpg, or .jpeg."
                });
                return undefined;
            })();
        if (!format)
            return;
        // Determine analysis type and price
        const analysisType = format === "image" ? "image" : "standard";
        const analysisPrice = await getAnalysisPrice(analysisType);
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
        if (format === "image") {
            const mimeType = file.mimetype && file.mimetype.startsWith("image/")
                ? file.mimetype
                : "image/jpeg";
            const imageBase64 = file.buffer.toString("base64");
            const ai = await interpretEcgImageWithGemini({ imageBase64, mimeType, patient: patientInfo });
            const id = nanoid();
            const report = {
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
            await saveReport(report, facilityId);
            // Deduct from wallet after successful analysis
            const deduction = await deductFromWallet(facilityId, analysisPrice, `AI Analysis - Image ECG`, id, { reportId: id, format, analysisType: "image" });
            if (!deduction.success) {
                console.error("Failed to deduct from wallet after analysis:", deduction.error);
                // Report is already saved, but transaction failed - this should be logged and handled
            }
            res.json(report);
            return;
        }
        const text = file.buffer.toString("utf8");
        const signal = format === "csv"
            ? parseEcgFromCsv(text, sampleRateHz)
            : parseEcgFromJson(text);
        const { cleaned, normalized, summary } = preprocessEcg(signal);
        const ai = await interpretWithGemini({ signal, preprocess: summary, patient: patientInfo });
        const id = nanoid();
        const report = {
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
                heartRateBpm: ai.structured.measurements.heartRateBpm ??
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
        await saveReport(report, facilityId);
        // Deduct from wallet after successful analysis
        const deduction = await deductFromWallet(facilityId, analysisPrice, `AI Analysis - Signal ECG`, id, { reportId: id, format, analysisType: "standard" });
        if (!deduction.success) {
            console.error("Failed to deduct from wallet after analysis:", deduction.error);
            // Report is already saved, but transaction failed - this should be logged and handled
        }
        res.json(report);
    }
    catch (err) {
        const message = err?.message ?? "Unknown error";
        res.status(400).json({ error: message });
    }
});
// ==================== Settings ====================
const UpdateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
});
const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
facilityRouter.patch("/profile", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const data = UpdateProfileSchema.parse(req.body);
        if (Object.keys(data).length === 0) {
            res.status(400).json({ error: "No fields to update" });
            return;
        }
        const updated = await updateFacility(facilityId, data);
        if (!updated) {
            res.status(404).json({ error: "Facility not found" });
            return;
        }
        res.json({
            facility: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            },
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Failed to update profile" });
    }
});
facilityRouter.patch("/password", async (req, res) => {
    try {
        const facilityId = req.facilityId;
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
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Failed to update password" });
    }
});
facilityRouter.get("/profile", async (req, res) => {
    try {
        const facilityId = req.facilityId;
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
                createdAt: facility.createdAt,
                updatedAt: facility.updatedAt,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch profile" });
    }
});
// ==================== Analytics ====================
facilityRouter.get("/analytics/summary", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const summary = await getAnalyticsSummary(facilityId, fromDate, toDate);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch analytics summary" });
    }
});
facilityRouter.get("/analytics/volume", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const period = req.query.period || "daily";
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const volumeData = await getVolumeData(facilityId, period, fromDate, toDate);
        res.json(volumeData);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch volume data" });
    }
});
facilityRouter.get("/analytics/abnormalities", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const distribution = await getAbnormalityDistribution(facilityId, fromDate, toDate, limit);
        res.json(distribution);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch abnormality distribution" });
    }
});
facilityRouter.get("/analytics/demographics", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const demographics = await getDemographicsData(facilityId, fromDate, toDate);
        res.json(demographics);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch demographics data" });
    }
});
// ==================== Wallet Management ====================
facilityRouter.get("/wallet", async (req, res) => {
    try {
        const facilityId = req.facilityId;
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
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch wallet" });
    }
});
facilityRouter.get("/wallet/transactions", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        const result = await getWalletTransactions(facilityId, limit, offset, fromDate, toDate);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch transactions" });
    }
});
facilityRouter.get("/pricing", async (req, res) => {
    try {
        const pricing = await getAnalysisPrice("standard");
        const imagePricing = await getAnalysisPrice("image");
        res.json({
            standard: pricing,
            image: imagePricing,
            currency: "GHS",
        });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch pricing" });
    }
});
// Initialize Paystack top-up
facilityRouter.post("/wallet/topup/initialize", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const { amount } = req.body;
        if (!amount || typeof amount !== "number" || amount <= 0) {
            res.status(400).json({ error: "Invalid amount. Must be a positive number." });
            return;
        }
        // Minimum top-up amount: ₵10.00
        if (amount < 10) {
            res.status(400).json({ error: "Minimum top-up amount is ₵10.00" });
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
        const topUp = await createTopUp(facilityId, amount, paystackResponse.data.reference);
        res.json({
            success: true,
            authorizationUrl: paystackResponse.data.authorization_url,
            accessCode: paystackResponse.data.access_code,
            reference: paystackResponse.data.reference,
            topUpId: topUp.id,
        });
    }
    catch (err) {
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
facilityRouter.post("/wallet/topup/verify", async (req, res) => {
    try {
        const facilityId = req.facilityId;
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
                    newBalance: parseFloat(wallet.balance.toString()),
                });
            }
            else {
                res.status(400).json({ error: result.error || "Failed to verify top-up" });
            }
        }
        else {
            // Payment failed
            await markTopUpFailed(reference, verification.message);
            res.status(400).json({
                error: "Payment verification failed",
                message: verification.message
            });
        }
    }
    catch (err) {
        console.error("Top-up verification error:", err);
        res.status(500).json({ error: err?.message || "Failed to verify top-up" });
    }
});
// Get top-up history
facilityRouter.get("/wallet/topups", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const result = await getFacilityTopUps(facilityId, limit, offset);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch top-ups" });
    }
});
// Manual top-up endpoint (for admin only - kept for backward compatibility)
facilityRouter.post("/wallet/topup/manual", async (req, res) => {
    try {
        const facilityId = req.facilityId;
        const { amount, description } = req.body;
        if (!amount || typeof amount !== "number" || amount <= 0) {
            res.status(400).json({ error: "Invalid amount. Must be a positive number." });
            return;
        }
        const result = await addToWallet(facilityId, amount, description || "Manual Top-Up", undefined, { method: "manual", initiatedBy: facilityId });
        if (!result.success) {
            res.status(400).json({ error: result.error || "Failed to add funds" });
            return;
        }
        const wallet = await getFacilityWallet(facilityId);
        res.json({
            success: true,
            transaction: result.transaction,
            newBalance: parseFloat(wallet.balance.toString()),
        });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to top up wallet" });
    }
});
export { facilityRouter };
