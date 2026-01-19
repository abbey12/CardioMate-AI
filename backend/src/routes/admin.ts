import express from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import {
  getAllFacilities,
  getFacilityById,
  deleteFacility,
  getAllReports,
  getReportCount,
  getRevenueStats,
  getPricingConfig,
  updatePricing,
  getRevenueByFacility,
  getRevenueByAnalysisType,
  getPlatformSetting,
  updatePlatformSetting,
  getAdminReferralStats,
  getReport,
  getAdminVolumeData,
  getAdminAbnormalityDistribution,
  getAdminDemographicsData,
  getAdminAnalyticsSummary,
  getAdminFacilityHealth,
  createAdminAuditLog,
  addToWallet,
  deductFromWallet,
  getAdminAuditLogs,
  getPaystackWebhookEvents,
  getPaystackWebhookEventById,
  updatePaystackWebhookEvent,
  getCountryPricing,
  getAllCountryPricing,
  setCountryPricing,
  deleteCountryPricing,
  getAllTopUps,
  getTopUpByReference,
  verifyTopUp,
  markTopUpFailed,
  logSystemEvent,
  anonymizeReportsOlderThan,
  purgeReportsOlderThan,
  getSystemEventSummary,
  getSystemEvents,
} from "../services/db.js";
import { query } from "../db/connection.js";
import { generateEcgReportPdf } from "../services/pdf.js";
import { pesewasToGhs } from "../services/paystack.js";

const adminRouter = express.Router();

// All admin routes require authentication
adminRouter.use(requireAdmin);

// ==================== Facilities Management ====================

adminRouter.get("/facilities", async (req, res): Promise<void> => {
  try {
    const facilities = await getAllFacilities();
    res.json(facilities.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      createdAt: f.createdAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch facilities" });
  }
});

adminRouter.get("/facilities/:id", async (req, res): Promise<void> => {
  try {
    const facility = await getFacilityById(req.params.id);
    if (!facility) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }
    
    // Get report count for this facility
    const reportCount = await getReportCount(facility.id);
    
    // Get wallet balance if wallet exists
    let walletBalance = 0;
    try {
      const walletResult = await query(
        `SELECT balance, currency FROM facility_wallets WHERE facility_id = $1`,
        [facility.id]
      );
      if (walletResult.rows.length > 0) {
        walletBalance = parseFloat(walletResult.rows[0].balance) || 0;
      }
    } catch (e) {
      // Wallet might not exist, use default
    }
    
    res.json({
      id: facility.id,
      name: facility.name,
      email: facility.email,
      createdAt: facility.createdAt,
      totalReports: reportCount,
      walletBalance: walletBalance,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch facility" });
  }
});

adminRouter.delete("/facilities/:id", async (req, res): Promise<void> => {
  try {
    const deleted = await deleteFacility(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Facility not found" });
      return;
    }
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "facility.delete",
      entityType: "facility",
      entityId: req.params.id,
      metadata: { name: deleted.name, email: deleted.email },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ message: "Facility deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete facility" });
  }
});

// ==================== Reports (All Facilities) ====================

adminRouter.get("/reports", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const reports = await getAllReports(limit, offset);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch reports" });
  }
});

adminRouter.get("/reports/:id", async (req, res): Promise<void> => {
  try {
    const report = await getReport(req.params.id); // No facilityId = admin can view any report
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch report" });
  }
});

adminRouter.get("/reports/:id/download", async (req, res): Promise<void> => {
  try {
    const report = await getReport(req.params.id);
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
  } catch (err: any) {
    console.error("Admin PDF generation error:", err);
    res.status(500).json({
      error: "Failed to generate PDF report",
      details: err?.message,
    });
  }
});

// ==================== Statistics ====================

adminRouter.get("/stats", async (req, res): Promise<void> => {
  try {
    const totalReports = await getReportCount();
    const facilities = await getAllFacilities();
    const revenueStats = await getRevenueStats();
    
    res.json({
      totalFacilities: facilities.length,
      totalReports,
      revenue: revenueStats,
      facilities: facilities.map((f) => ({
        id: f.id,
        name: f.name,
        email: f.email,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch statistics" });
  }
});

// ==================== Admin Analytics ====================

adminRouter.get("/analytics/summary", async (req, res): Promise<void> => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const summary = await getAdminAnalyticsSummary(fromDate, toDate);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch analytics summary" });
  }
});

adminRouter.get("/analytics/volume", async (req, res): Promise<void> => {
  try {
    const period = (req.query.period as "daily" | "weekly" | "monthly") || "daily";
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const volumeData = await getAdminVolumeData(period, fromDate, toDate);
    res.json(volumeData);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch volume data" });
  }
});

adminRouter.get("/analytics/abnormalities", async (req, res): Promise<void> => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const limit = Number(req.query.limit) || 10;
    const distribution = await getAdminAbnormalityDistribution(fromDate, toDate, limit);
    res.json(distribution);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch abnormality distribution" });
  }
});

adminRouter.get("/analytics/demographics", async (req, res): Promise<void> => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const demographics = await getAdminDemographicsData(fromDate, toDate);
    res.json(demographics);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch demographics data" });
  }
});

adminRouter.get("/analytics/facility-health", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 10;
    const data = await getAdminFacilityHealth(limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch facility health data" });
  }
});

// ==================== Audit Logs ====================

adminRouter.get("/audit-logs", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const logs = await getAdminAuditLogs(limit, offset);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch audit logs" });
  }
});

// ==================== Payment Ops ====================

adminRouter.get("/paystack/webhooks", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string | undefined;
    const events = await getPaystackWebhookEvents(limit, offset, status);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch webhook events" });
  }
});

adminRouter.post("/paystack/webhooks/:id/retry", async (req, res): Promise<void> => {
  try {
    const eventId = req.params.id;
    const event = await getPaystackWebhookEventById(eventId);
    if (!event) {
      res.status(404).json({ error: "Webhook event not found" });
      return;
    }

    const payload = event.payload;
    if (!payload?.event) {
      await updatePaystackWebhookEvent(eventId, "failed", "Invalid webhook payload");
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    if (payload.event === "charge.success") {
      const { reference, amount, status } = payload.data;
      if (status === "success") {
        const topUp = await getTopUpByReference(reference);
        if (topUp && topUp.status === "pending") {
          const amountReceived = pesewasToGhs(amount);
          const result = await verifyTopUp(reference, amountReceived);
          if (result.success) {
            await updatePaystackWebhookEvent(eventId, "processed");
            res.json({ success: true });
            return;
          }
          await updatePaystackWebhookEvent(eventId, "failed", result.error);
          await logSystemEvent({
            eventType: "webhook_error",
            message: `Webhook retry failed: ${reference}`,
            context: { reference, error: result.error },
          });
          res.status(500).json({ error: result.error });
          return;
        }
        await updatePaystackWebhookEvent(eventId, "processed", "Top-up already processed or not found");
        res.json({ success: true });
        return;
      }
      await markTopUpFailed(reference, "Payment failed");
      await updatePaystackWebhookEvent(eventId, "failed", "Payment failed");
      res.json({ success: true });
      return;
    }

    await updatePaystackWebhookEvent(eventId, "processed");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to retry webhook event" });
  }
});

adminRouter.get("/topups", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const data = await getAllTopUps(limit, offset);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch top-ups" });
  }
});

// ==================== Operational Status ====================

adminRouter.get("/ops/status", async (req, res): Promise<void> => {
  try {
    const summary = await getSystemEventSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch ops status" });
  }
});

adminRouter.get("/ops/events", async (req, res): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const eventType = req.query.type as string | undefined;
    const events = await getSystemEvents(limit, offset, eventType);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch ops events" });
  }
});

// ==================== Revenue Statistics ====================

adminRouter.get("/revenue", async (req, res): Promise<void> => {
  try {
    const revenueStats = await getRevenueStats();
    res.json(revenueStats);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch revenue statistics" });
  }
});

// ==================== Pricing Management ====================

const UpdatePricingSchema = z.object({
  analysisType: z.enum(["standard", "image"]),
  pricePerAnalysis: z.number().positive().min(0.01),
});

const WalletAdjustSchema = z.object({
  facilityId: z.string().min(1),
  amount: z.number().positive(),
  direction: z.enum(["credit", "debit"]),
  reason: z.string().min(3),
});

adminRouter.get("/pricing", async (req, res): Promise<void> => {
  try {
    const pricing = await getPricingConfig();
    res.json(pricing);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch pricing" });
  }
});

adminRouter.put("/pricing", async (req, res): Promise<void> => {
  try {
    const data = UpdatePricingSchema.parse(req.body);
    const updatedPricing = await updatePricing(data.analysisType, data.pricePerAnalysis);
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "pricing.update",
      entityType: "pricing",
      entityId: data.analysisType,
      metadata: { pricePerAnalysis: data.pricePerAnalysis },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(updatedPricing);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update pricing" });
  }
});

// ==================== Country Pricing Management ====================

const SetCountryPricingSchema = z.object({
  country: z.string().min(1),
  analysisType: z.enum(["standard", "image"]),
  pricePerAnalysis: z.number().positive().min(0.01),
  currency: z.string().length(3).optional(),
});

adminRouter.get("/country-pricing", async (req, res): Promise<void> => {
  try {
    const country = req.query.country as string | undefined;
    const pricing = country 
      ? await getCountryPricing(country)
      : await getAllCountryPricing();
    res.json(pricing);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch country pricing" });
  }
});

adminRouter.post("/country-pricing", async (req, res): Promise<void> => {
  try {
    const data = SetCountryPricingSchema.parse(req.body);
    const updatedPricing = await setCountryPricing(
      data.country,
      data.analysisType,
      data.pricePerAnalysis,
      data.currency || "GHS"
    );
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "country_pricing.set",
      entityType: "country_pricing",
      entityId: `${data.country}-${data.analysisType}`,
      metadata: { 
        country: data.country,
        analysisType: data.analysisType,
        pricePerAnalysis: data.pricePerAnalysis,
        currency: data.currency || "GHS"
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(updatedPricing);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to set country pricing" });
  }
});

adminRouter.delete("/country-pricing/:id", async (req, res): Promise<void> => {
  try {
    const id = req.params.id;
    const deleted = await deleteCountryPricing(id);
    if (!deleted) {
      res.status(404).json({ error: "Country pricing not found" });
      return;
    }
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "country_pricing.delete",
      entityType: "country_pricing",
      entityId: id,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete country pricing" });
  }
});

// ==================== Wallet Adjustments ====================

adminRouter.post("/wallet/adjust", async (req, res): Promise<void> => {
  try {
    const data = WalletAdjustSchema.parse(req.body);
    const description = `Admin adjustment: ${data.reason}`;
    const adminId = req.user?.userId;

    if (data.direction === "credit") {
      const result = await addToWallet(data.facilityId, data.amount, description, undefined, {
        type: "admin_adjustment",
        adminId,
      });
      if (!result.success) {
        res.status(400).json({ error: result.error || "Failed to credit wallet" });
        return;
      }
    } else {
      const result = await deductFromWallet(data.facilityId, data.amount, description, undefined, {
        type: "admin_adjustment",
        adminId,
      });
      if (!result.success) {
        res.status(400).json({ error: result.error || "Failed to debit wallet" });
        return;
      }
    }

    await createAdminAuditLog({
      adminId,
      action: "wallet.adjust",
      entityType: "wallet",
      entityId: data.facilityId,
      metadata: { direction: data.direction, amount: data.amount, reason: data.reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to adjust wallet" });
  }
});

// ==================== Revenue Analytics ====================

adminRouter.get("/revenue/by-facility", async (req, res): Promise<void> => {
  try {
    const facilityRevenues = await getRevenueByFacility();
    res.json(facilityRevenues);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch revenue by facility" });
  }
});

adminRouter.get("/revenue/by-analysis-type", async (req, res): Promise<void> => {
  try {
    const revenueByType = await getRevenueByAnalysisType();
    res.json(revenueByType);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch revenue by analysis type" });
  }
});

// ==================== Platform Settings ====================

adminRouter.get("/settings/bonuses", async (req, res): Promise<void> => {
  try {
    const signupBonus = await getPlatformSetting("signup_bonus_amount");
    const referralBonus = await getPlatformSetting("referral_bonus_amount");
    
    res.json({
      signupBonus: signupBonus?.settingValue || { amount: 50.00, currency: "GHS", enabled: true },
      referralBonus: referralBonus?.settingValue || { amount: 25.00, currency: "GHS", enabled: true },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch bonus settings" });
  }
});

const UpdateBonusSchema = z.object({
  type: z.enum(["signup", "referral"]),
  amount: z.number().min(0),
  enabled: z.boolean(),
});

const RetentionSettingsSchema = z.object({
  retentionDays: z.number().int().min(1).max(3650),
  retentionEnabled: z.boolean(),
  anonymizeAfterDays: z.number().int().min(1).max(3650),
  anonymizeEnabled: z.boolean(),
});

const LanguageSettingsSchema = z.object({
  language: z.enum(["en", "fr"]),
});

adminRouter.put("/settings/bonuses", async (req, res): Promise<void> => {
  try {
    const data = UpdateBonusSchema.parse(req.body);
    const userId = req.user!.userId;
    
    const settingKey = data.type === "signup" ? "signup_bonus_amount" : "referral_bonus_amount";
    const settingValue = {
      amount: data.amount,
      currency: "GHS",
      enabled: data.enabled,
    };
    
    const updated = await updatePlatformSetting(settingKey, settingValue, userId);
    await createAdminAuditLog({
      adminId: userId,
      action: "bonuses.update",
      entityType: "platform_setting",
      entityId: settingKey,
      metadata: settingValue,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(updated.settingValue);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update bonus settings" });
  }
});

// ==================== Retention & Privacy ====================

adminRouter.get("/settings/retention", async (req, res): Promise<void> => {
  try {
    const retention = await getPlatformSetting("data_retention_days");
    const anonymize = await getPlatformSetting("anonymize_after_days");
    res.json({
      retention: retention?.settingValue || { days: 365, enabled: false },
      anonymize: anonymize?.settingValue || { days: 30, enabled: false },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch retention settings" });
  }
});

adminRouter.get("/settings/language", async (req, res): Promise<void> => {
  try {
    const language = await getPlatformSetting("default_language");
    res.json({
      language: language?.settingValue?.language || "en",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch language settings" });
  }
});

adminRouter.put("/settings/language", async (req, res): Promise<void> => {
  try {
    const data = LanguageSettingsSchema.parse(req.body);
    const adminId = req.user!.userId;
    const updated = await updatePlatformSetting("default_language", { language: data.language }, adminId);

    await createAdminAuditLog({
      adminId,
      action: "language.update",
      entityType: "platform_setting",
      entityId: "default_language",
      metadata: updated.settingValue,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ language: updated.settingValue?.language || data.language });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update language settings" });
  }
});

adminRouter.put("/settings/retention", async (req, res): Promise<void> => {
  try {
    const data = RetentionSettingsSchema.parse(req.body);
    const adminId = req.user!.userId;

    const retentionSetting = await updatePlatformSetting(
      "data_retention_days",
      { days: data.retentionDays, enabled: data.retentionEnabled },
      adminId
    );
    const anonymizeSetting = await updatePlatformSetting(
      "anonymize_after_days",
      { days: data.anonymizeAfterDays, enabled: data.anonymizeEnabled },
      adminId
    );

    await createAdminAuditLog({
      adminId,
      action: "retention.update",
      entityType: "platform_setting",
      entityId: "data_retention_days",
      metadata: { retention: retentionSetting.settingValue, anonymize: anonymizeSetting.settingValue },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      retention: retentionSetting.settingValue,
      anonymize: anonymizeSetting.settingValue,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to update retention settings" });
  }
});

adminRouter.post("/reports/anonymize", async (req, res): Promise<void> => {
  try {
    const days = Number(req.body?.days) || 30;
    const count = await anonymizeReportsOlderThan(days);
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "reports.anonymize",
      entityType: "ecg_reports",
      metadata: { days, count },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true, anonymized: count });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to anonymize reports" });
  }
});

adminRouter.post("/reports/purge", async (req, res): Promise<void> => {
  try {
    const days = Number(req.body?.days) || 365;
    const count = await purgeReportsOlderThan(days);
    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "reports.purge",
      entityType: "ecg_reports",
      metadata: { days, count },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true, purged: count });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to purge reports" });
  }
});

// ==================== Referral Statistics ====================

adminRouter.get("/referrals/stats", async (req, res): Promise<void> => {
  try {
    const stats = await getAdminReferralStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch referral statistics" });
  }
});

export { adminRouter };

