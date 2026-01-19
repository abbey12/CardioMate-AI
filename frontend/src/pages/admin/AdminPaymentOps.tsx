import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getPaystackWebhookEvents, retryPaystackWebhookEvent, getAdminTopUps, type PaystackWebhookEvent } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { AlertTriangle, CheckCircle2, RefreshCw, Wallet, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

export function AdminPaymentOps() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: webhooks, isLoading: webhooksLoading, refetch: refetchWebhooks } = useQuery<PaystackWebhookEvent[]>({
    queryKey: ["paystackWebhooks", statusFilter],
    queryFn: () => getPaystackWebhookEvents(token!, statusFilter === "all" ? undefined : statusFilter),
    enabled: !!token && isAdmin,
  });

  const { data: topUps, isLoading: topUpsLoading, refetch: refetchTopUps } = useQuery({
    queryKey: ["adminTopUps"],
    queryFn: () => getAdminTopUps(token!),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  const totalWebhooks = webhooks?.length || 0;
  const failedWebhooks = webhooks?.filter((e) => e.status === "failed").length || 0;
  const processedWebhooks = webhooks?.filter((e) => e.status === "processed").length || 0;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              {t("adminPaymentOps.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminPaymentOps.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              refetchWebhooks();
              refetchTopUps();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: COLORS.WHITE,
              color: COLORS.GRAY_600,
              border: `1px solid ${COLORS.GRAY_200}`,
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <RefreshCw size={16} />
            {t("adminPaymentOps.refresh")}
          </button>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.summary.totalWebhooks")}</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{totalWebhooks}</div>
          </div>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.summary.processed")}</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.SUCCESS }}>{processedWebhooks}</div>
          </div>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.summary.failed")}</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.RED }}>{failedWebhooks}</div>
          </div>
        </div>

        {/* Webhooks Table */}
        <div style={{ background: COLORS.WHITE, borderRadius: "16px", border: `1px solid ${COLORS.GRAY_200}`, overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.GRAY_200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("adminPaymentOps.webhooks.title")}
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${COLORS.GRAY_200}` }}
            >
              <option value="all">{t("adminPaymentOps.status.all")}</option>
              <option value="processed">{t("adminPaymentOps.status.processed")}</option>
              <option value="failed">{t("adminPaymentOps.status.failed")}</option>
              <option value="pending">{t("adminPaymentOps.status.pending")}</option>
            </select>
          </div>
          {webhooksLoading ? (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminPaymentOps.webhooks.loading")}
            </div>
          ) : webhooks && webhooks.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.webhooks.table.event")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.webhooks.table.reference")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.webhooks.table.status")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.webhooks.table.attempts")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.webhooks.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((event) => (
                    <tr key={event.id} style={{ borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
                      <td style={{ padding: "12px 16px" }}>{event.eventType}</td>
                      <td style={{ padding: "12px 16px" }}>{event.reference || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {event.status === "processed" ? (
                          <span style={{ color: COLORS.SUCCESS }}><CheckCircle2 size={14} /> {t("adminPaymentOps.status.processed")}</span>
                        ) : event.status === "failed" ? (
                          <span style={{ color: COLORS.RED }}><AlertTriangle size={14} /> {t("adminPaymentOps.status.failed")}</span>
                        ) : (
                          <span style={{ color: COLORS.GRAY_500 }}>{t("adminPaymentOps.status.pending")}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>{event.attempts}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {event.status === "failed" && (
                          <button
                            onClick={() => retryPaystackWebhookEvent(token!, event.id).then(() => refetchWebhooks())}
                            style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${COLORS.GRAY_200}`, background: COLORS.WHITE }}
                          >
                            {t("adminPaymentOps.webhooks.retry")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminPaymentOps.webhooks.empty")}
            </div>
          )}
        </div>

        {/* Top-ups */}
        <div style={{ background: COLORS.WHITE, borderRadius: "16px", border: `1px solid ${COLORS.GRAY_200}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("adminPaymentOps.topUps.title")}
            </h2>
          </div>
          {topUpsLoading ? (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminPaymentOps.topUps.loading")}
            </div>
          ) : topUps?.topUps?.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.topUps.table.reference")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.topUps.table.requested")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.topUps.table.received")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminPaymentOps.topUps.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {topUps.topUps.slice(0, 20).map((topUp) => {
                    const amountRequested = typeof topUp.amountRequested === 'string' 
                      ? parseFloat(topUp.amountRequested) 
                      : (topUp.amountRequested || 0);
                    const amountReceived = topUp.amountReceived 
                      ? (typeof topUp.amountReceived === 'string' 
                          ? parseFloat(topUp.amountReceived) 
                          : topUp.amountReceived)
                      : 0;
                    return (
                      <tr key={topUp.id} style={{ borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
                        <td style={{ padding: "12px 16px" }}>{topUp.paystackReference}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>₵{amountRequested.toFixed(2)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>₵{amountReceived.toFixed(2)}</td>
                        <td style={{ padding: "12px 16px" }}>{topUp.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminPaymentOps.topUps.empty")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

