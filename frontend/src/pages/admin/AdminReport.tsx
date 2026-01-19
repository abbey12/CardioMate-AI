import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAdminReport, downloadAdminReportPdf } from "../../lib/api";
import { Waveform } from "../../ui/Waveform";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { AlertCircle, CheckCircle2, Activity, Building2, ArrowLeft, Download } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

function Field(props: { label: string; value?: React.ReactNode; icon?: React.ReactNode }): JSX.Element {
  return (
    <div style={{
      padding: "16px",
      borderRadius: "12px",
      background: COLORS.WHITE,
      border: `1px solid ${COLORS.GRAY_200}`,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <div style={{ 
        fontSize: "12px", 
        color: COLORS.GRAY_500, 
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
        {props.icon}
        {props.label}
      </div>
      <div style={{ 
        marginTop: "4px", 
        fontWeight: "600",
        fontSize: "16px",
        color: COLORS.GRAY_800
      }}>
        {props.value ?? <span style={{ color: COLORS.GRAY_400 }}>—</span>}
      </div>
    </div>
  );
}

export function AdminReport() {
  const { id } = useParams<{ id: string }>();
  const { token, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: report, isLoading } = useQuery({
    queryKey: ["adminReport", id],
    queryFn: () => getAdminReport(token!, id!, handleTokenRefresh),
    enabled: !!token && !!id && isAdmin,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  const rPeaksPreview = useMemo(() => {
    if (!report?.preprocess?.rPeakIndices || !report?.signalPreview?.normalized)
      return [];
    const limit = report.signalPreview.normalized.length;
    return report.preprocess.rPeakIndices.filter((i) => i >= 0 && i < limit);
  }, [report]);

  if (!isAdmin || !token) {
    return null;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ color: COLORS.GRAY_500 }}>{t("adminReport.loading")}</div>
        </div>
      </AdminLayout>
    );
  }

  if (!report) {
    return (
      <AdminLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ color: COLORS.GRAY_500 }}>{t("adminReport.notFound")}</div>
          <Link
            to="/admin/reports"
            style={{
              display: "inline-block",
              marginTop: "16px",
              color: COLORS.RED,
              textDecoration: "none",
            }}
          >
            {t("adminReport.backToReports")}
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <Link
              to="/admin/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: COLORS.BLUE,
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              <ArrowLeft size={16} />
              {t("adminReport.backToAllReports")}
            </Link>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              {t("adminReport.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminReport.reportId", { id: report.id })} · {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                downloadAdminReportPdf(token!, report.id, handleTokenRefresh).catch((err: any) => {
                  alert(err?.message || t("adminReport.downloadFailed"));
                });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
              }}
            >
              <Download size={18} />
              {t("adminReport.downloadPdf")}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <div style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
              paddingBottom: "20px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
            }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 6px 0" }}>
                  {t("adminReport.aiReport")}
                </h2>
                <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                  {t("adminReport.modelCreated", {
                    createdAt: new Date(report.createdAt).toLocaleString(),
                  })}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {report.source.format === "image" && report.imagePreview ? (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "12px" }}>
                    {t("adminReport.uploadedImage")}
                  </h3>
                  <div style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: `1px solid ${COLORS.GRAY_200}`,
                    background: COLORS.GRAY_50,
                    padding: "12px",
                  }}>
                    <img
                      alt={t("adminReport.uploadedImageAlt")}
                      src={`data:${report.imagePreview.mimeType};base64,${report.imagePreview.base64}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "16px",
                marginBottom: "24px"
              }}>
                <Field 
                  label={t("adminReport.fields.heartRate")}
                  value={report.measurements.heartRateBpm ? t("adminReport.fields.heartRateValue", { value: report.measurements.heartRateBpm }) : t("adminReport.na")}
                  icon={<Activity size={16} color={COLORS.RED} />}
                />
                <Field 
                  label={t("adminReport.fields.rhythm")}
                  value={report.measurements.rhythm}
                  icon={<Activity size={16} color={COLORS.RED} />}
                />
                <Field 
                  label={t("adminReport.fields.prInterval")}
                  value={`${report.measurements.prMs} ms`}
                  icon={<Activity size={16} color={COLORS.BLUE} />}
                />
                <Field 
                  label={t("adminReport.fields.qrsDuration")}
                  value={`${report.measurements.qrsMs} ms`}
                  icon={<Activity size={16} color={COLORS.BLUE} />}
                />
                <Field 
                  label={t("adminReport.fields.qtInterval")}
                  value={`${report.measurements.qtMs} ms`}
                  icon={<Activity size={16} color={COLORS.BLUE} />}
                />
                <Field 
                  label={t("adminReport.fields.qtcInterval")}
                  value={`${report.measurements.qtcMs} ms`}
                  icon={<Activity size={16} color={COLORS.BLUE} />}
                />
              </div>

              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: report.abnormalities && report.abnormalities.length > 0 
                  ? COLORS.RED_LIGHT 
                  : "#f0fdf4",
                border: `1px solid ${report.abnormalities && report.abnormalities.length > 0 
                  ? COLORS.RED_BORDER 
                  : "#bbf7d0"}`,
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: COLORS.GRAY_800,
                  margin: "0 0 12px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  {report.abnormalities && report.abnormalities.length > 0 ? (
                    <AlertCircle size={20} color={COLORS.RED} />
                  ) : (
                    <CheckCircle2 size={20} color={COLORS.SUCCESS} />
                  )}
                  Abnormalities
                </h3>
                {report.abnormalities?.length ? (
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: "24px", 
                    color: COLORS.RED_DARK,
                    fontSize: "14px",
                    lineHeight: "1.8"
                  }}>
                    {report.abnormalities.map((a, i) => (
                      <li key={i} style={{ marginBottom: "6px" }}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: COLORS.SUCCESS, fontSize: "14px" }}>
                    No abnormalities detected. ECG appears normal.
                  </div>
                )}
              </div>

              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: COLORS.GRAY_50,
                border: `1px solid ${COLORS.GRAY_200}`,
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: COLORS.GRAY_800,
                  margin: "0 0 12px 0"
                }}>
                  Clinical Impression
                </h3>
                <p style={{ 
                  color: COLORS.GRAY_700, 
                  fontSize: "15px", 
                  lineHeight: "1.7",
                  margin: 0
                }}>
                  {report.clinicalImpression}
                </p>
              </div>

              {report.recommendations && report.recommendations.length > 0 && (
                <div style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: COLORS.BLUE_LIGHT,
                  border: `1px solid ${COLORS.BLUE_BORDER}`,
                }}>
                  <h3 style={{ 
                    fontSize: "18px", 
                    fontWeight: "600", 
                    color: COLORS.GRAY_800,
                    margin: "0 0 12px 0"
                  }}>
                    Recommendations
                  </h3>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: "24px", 
                    color: COLORS.BLUE_DARK,
                    fontSize: "14px",
                    lineHeight: "1.8"
                  }}>
                    {report.recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: "6px" }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.patient && (
                <div style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: COLORS.GRAY_50,
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}>
                  <h3 style={{ 
                    fontSize: "18px", 
                    fontWeight: "600", 
                    color: COLORS.GRAY_800,
                    margin: "0 0 16px 0"
                  }}>
                    {t("adminReport.patientInfoTitle")}
                  </h3>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "16px"
                  }}>
                    <Field label={t("adminReport.fields.name")} value={t("adminReport.fields.anonymizedName", { id: report.id.slice(0, 8) })} />
                    <Field label={t("adminReport.fields.age")} value={report.patient.age ? t("adminReport.fields.ageValue", { value: report.patient.age }) : t("adminReport.na")} />
                    <Field label={t("adminReport.fields.sex")} value={report.patient.sex || t("adminReport.na")} />
                    {report.patient.clinicalIndication && (
                      <Field label={t("adminReport.fields.clinicalIndication")} value={report.patient.clinicalIndication} />
                    )}
                    {report.patient.medications && report.patient.medications.length > 0 && (
                      <Field 
                        label={t("adminReport.fields.medications")}
                        value={t("adminReport.fields.medicationsCount", { count: report.patient.medications.length })} 
                      />
                    )}
                  </div>
                  <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    borderRadius: "8px",
                    background: COLORS.BLUE_LIGHT,
                    border: `1px solid ${COLORS.BLUE_BORDER}`,
                    fontSize: "12px",
                    color: COLORS.BLUE_DARK,
                  }}>
                    <strong>{t("adminReport.privacyNote.title")}</strong> {t("adminReport.privacyNote.body")}
                  </div>
                </div>
              )}

              {report.signalPreview?.normalized?.length ? (
                <div style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: COLORS.GRAY_50,
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}>
                  <h3 style={{ 
                    fontSize: "18px", 
                    fontWeight: "600", 
                    color: COLORS.GRAY_800,
                    margin: "0 0 16px 0"
                  }}>
                    {t("adminReport.waveformPreview")}
                  </h3>
                  <Waveform
                    title={t("adminReport.waveformTitle")}
                    samples={report.signalPreview.normalized}
                    rPeaks={rPeaksPreview}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

