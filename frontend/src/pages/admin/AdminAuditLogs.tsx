import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAdminAuditLogs, type AdminAuditLog } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Shield, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

export function AdminAuditLogs() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const { data: logs, isLoading, refetch } = useQuery<AdminAuditLog[]>({
    queryKey: ["adminAuditLogs", currentPage],
    queryFn: () => getAdminAuditLogs(token!, pageSize, (currentPage - 1) * pageSize),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              {t("adminAuditLogs.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminAuditLogs.subtitle")}
            </p>
          </div>
          <button
            onClick={() => refetch()}
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
            {t("adminAuditLogs.refresh")}
          </button>
        </div>

        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminAuditLogs.loading")}
            </div>
          ) : logs && logs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAuditLogs.table.action")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAuditLogs.table.entity")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAuditLogs.table.metadata")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAuditLogs.table.time")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.id} style={{ borderBottom: index < logs.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Shield size={14} color={COLORS.BLUE} />
                          <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>{log.action}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "13px", color: COLORS.GRAY_700 }}>
                          {log.entityType || "—"} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500, maxWidth: "320px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminAuditLogs.empty")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

