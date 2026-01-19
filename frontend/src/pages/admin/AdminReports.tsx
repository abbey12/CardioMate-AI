import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAllReports } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { FileText, Search, Eye, Calendar } from "lucide-react";
import { COLORS } from "../../ui/colors";
import { useTranslation } from "react-i18next";

export function AdminReports() {
  const { token, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: reports, isLoading } = useQuery({
    queryKey: ["allReports"],
    queryFn: () => getAllReports(token!),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  const filteredReports = reports?.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.id.toLowerCase().includes(query) ||
      report.measurements.rhythm?.toLowerCase().includes(query) ||
      `patient ${report.id.slice(0, 8)}`.includes(query)
    );
  }) || [];

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        <div
          style={{
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              {t("adminReports.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminReports.subtitle")}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.GRAY_400,
              }}
            />
            <input
              type="text"
              placeholder={t("adminReports.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px 12px 48px",
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                fontSize: "14px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_800,
              }}
            />
          </div>
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
              {t("adminReports.loading")}
            </div>
          ) : filteredReports.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminReports.table.patient")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminReports.table.heartRate")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminReports.table.rhythm")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminReports.table.date")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminReports.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice(0, 50).map((report, index) => (
                    <tr key={report.id} style={{ borderBottom: index < filteredReports.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                          {t("adminReports.table.anonymizedPatient", { id: report.id.slice(0, 8) })}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_600 }}>
                          {report.measurements.heartRateBpm
                            ? t("adminReports.table.heartRateValue", { value: report.measurements.heartRateBpm })
                            : t("adminReports.na")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_600 }}>
                          {report.measurements.rhythm || t("adminReports.na")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_500 }}>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <Link
                          to={`/admin/reports/${report.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            background: COLORS.BLUE_LIGHT,
                            color: COLORS.BLUE,
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {searchQuery ? t("adminReports.empty.search") : t("adminReports.empty.default")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

