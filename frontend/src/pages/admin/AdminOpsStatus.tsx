import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getOpsStatus, getOpsEvents, type OpsStatusSummary, type SystemEvent } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { AlertTriangle, Activity, Mail, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

export function AdminOpsStatus() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();

  const { data: status, isLoading: statusLoading } = useQuery<OpsStatusSummary>({
    queryKey: ["opsStatus"],
    queryFn: () => getOpsStatus(token!),
    enabled: !!token && isAdmin,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<SystemEvent[]>({
    queryKey: ["opsEvents"],
    queryFn: () => getOpsEvents(token!),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
            {t("adminOpsStatus.title")}
          </h1>
          <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
            {t("adminOpsStatus.subtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <AlertTriangle size={16} color={COLORS.RED} />
              <span style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.cards.errors24h")}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
              {statusLoading ? "---" : status?.last24hErrors ?? 0}
            </div>
          </div>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Bot size={16} color={COLORS.BLUE} />
              <span style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.cards.aiErrors24h")}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
              {statusLoading ? "---" : status?.last24hAiErrors ?? 0}
            </div>
          </div>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Mail size={16} color={COLORS.BLUE} />
              <span style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.cards.emailErrors24h")}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
              {statusLoading ? "---" : status?.last24hEmailErrors ?? 0}
            </div>
          </div>
          <div style={{ background: COLORS.WHITE, borderRadius: "12px", padding: "16px", border: `1px solid ${COLORS.GRAY_200}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Activity size={16} color={COLORS.SUCCESS} />
              <span style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.cards.lastEvent")}</span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>
              {statusLoading ? "---" : status?.lastEventAt ? new Date(status.lastEventAt).toLocaleString() : t("adminOpsStatus.na")}
            </div>
          </div>
        </div>

        <div style={{ background: COLORS.WHITE, borderRadius: "16px", border: `1px solid ${COLORS.GRAY_200}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("adminOpsStatus.recentEvents.title")}
            </h2>
          </div>
          {eventsLoading ? (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminOpsStatus.recentEvents.loading")}
            </div>
          ) : events && events.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.recentEvents.table.type")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.recentEvents.table.message")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: COLORS.GRAY_500 }}>{t("adminOpsStatus.recentEvents.table.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={event.id} style={{ borderBottom: index < events.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none" }}>
                      <td style={{ padding: "12px 16px", color: COLORS.GRAY_700 }}>{event.eventType}</td>
                      <td style={{ padding: "12px 16px", color: COLORS.GRAY_600 }}>{event.message}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: COLORS.GRAY_500 }}>
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminOpsStatus.recentEvents.empty")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

