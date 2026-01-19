import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import { detectFormat, parseEcgFromCsv, parseEcgFromJson } from "../utils/ecgParse.js";
import { preprocessEcg } from "../utils/ecgPreprocess.js";
import { interpretEcgImageWithGemini, interpretWithGemini } from "../services/gemini.js";
import { generateEcgReportPdf } from "../services/pdf.js";
import { getReport, saveReport } from "../services/store.js";
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
export const ecgRouter = express.Router();
ecgRouter.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const q = UploadQuerySchema.parse(req.query);
        const sampleRateHz = q.sampleRateHz ?? 250;
        // Parse patient info from request body (JSON)
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
            saveReport(report);
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
            rawAiText: ai.rawText,
            model: ai.model,
            preprocess: summary
        };
        saveReport(report);
        res.json(report);
    }
    catch (err) {
        const message = err?.message ?? "Unknown error";
        res.status(400).json({ error: message });
    }
});
ecgRouter.get("/:id", (req, res) => {
    const report = getReport(req.params.id);
    if (!report) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json(report);
});
ecgRouter.get("/:id/download", async (req, res) => {
    try {
        const report = getReport(req.params.id);
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
