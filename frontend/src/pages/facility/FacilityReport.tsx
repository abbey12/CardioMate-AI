import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getFacilityReport, downloadReportPdf } from "../../lib/api";
import { Waveform } from "../../ui/Waveform";
import { Layout } from "../../components/layout/Layout";
import { MessageCircle, X, Send, User, Phone, AlertCircle, CheckCircle2, Activity, Users, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function Field(props: { label: string; value?: React.ReactNode; icon?: React.ReactNode }): JSX.Element {
  return (
    <div style={{
      padding: "16px",
      borderRadius: "12px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <div style={{ 
        fontSize: "12px", 
        color: "#64748b", 
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
        color: "#1e293b"
      }}>
        {props.value ?? <span style={{ color: "#94a3b8" }}>—</span>}
      </div>
    </div>
  );
}

export function FacilityReport() {
  const { id } = useParams<{ id: string }>();
  const { token, isFacility, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [physicianName, setPhysicianName] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState("");

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: report, isLoading } = useQuery({
    queryKey: ["facilityReport", id],
    queryFn: () => getFacilityReport(token!, id!, handleTokenRefresh),
    enabled: !!token && !!id && isFacility,
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

  async function handleDownloadPdf() {
    if (!report || !token) return;
    try {
      await downloadReportPdf(token, report.id, handleTokenRefresh);
    } catch (err: any) {
      if (err?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
      } else {
        alert(err?.message || t("facilityReport.errors.downloadFailed"));
      }
    }
  }

  function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");
    // If it doesn't start with +, assume it needs country code
    // For now, we'll require users to include country code
    return digits;
  }

  function generateWhatsAppMessage(): string {
    if (!report) return "";
    
    const patientName = report.patient?.name || "Patient";
    const reportDate = new Date(report.createdAt).toLocaleDateString();
    const heartRate = report.measurements.heartRateBpm || "N/A";
    const rhythm = report.measurements.rhythm || "N/A";
    const abnormalities = report.abnormalities?.length || 0;
    const reportUrl = `${window.location.origin}/facility/reports/${report.id}`;
    
    let message = `*ECG Report - ${patientName}*\n\n`;
    message += `📅 Date: ${reportDate}\n`;
    message += `💓 Heart Rate: ${heartRate} bpm\n`;
    message += `📊 Rhythm: ${rhythm}\n`;
    message += `⚠️ Abnormalities: ${abnormalities} ${abnormalities === 1 ? "finding" : "findings"}\n\n`;
    
    if (report.abnormalities && report.abnormalities.length > 0) {
      message += `*Findings:*\n`;
      report.abnormalities.slice(0, 3).forEach((abn) => {
        message += `• ${abn}\n`;
      });
      if (report.abnormalities.length > 3) {
        message += `...and ${report.abnormalities.length - 3} more\n`;
      }
      message += `\n`;
    }
    
    message += `*Clinical Impression:*\n${report.clinicalImpression}\n\n`;
    message += `📄 View full report: ${reportUrl}\n\n`;
    message += `_Report ID: ${report.id}_`;
    
    return encodeURIComponent(message);
  }

  function handleForwardToWhatsApp() {
    if (!physicianName.trim() || !physicianPhone.trim()) {
      alert("Please enter physician name and phone number");
      return;
    }

    const phone = formatPhoneNumber(physicianPhone);
    if (phone.length < 10) {
      alert("Please enter a valid phone number with country code (e.g., +1234567890)");
      return;
    }

    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");
    
    // Close modal and reset form
    setShowWhatsAppModal(false);
    setPhysicianName("");
    setPhysicianPhone("");
  }

  if (!isFacility || !token) {
    return null;
  }

  if (isLoading) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div>{t("facilityReport.loading")}</div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div>{t("facilityReport.notFound")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
              {t("facilityReport.title")}
            </h1>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
              Report ID: {report.id} · {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleDownloadPdf}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1d4ed8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#2563eb";
              }}
            >
              {t("facilityReport.actions.downloadPdf")}
            </button>
            <button
              onClick={() => setShowWhatsAppModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#25D366",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#20BA5A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#25D366";
              }}
            >
              <MessageCircle size={18} />
              {t("facilityReport.actions.forwardWhatsApp")}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid #e2e8f0",
          }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 6px 0" }}>
                Report
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                Created: {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {report.source.format === "image" && report.imagePreview ? (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
                  Uploaded ECG Image
                </h3>
                <div style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#f9fafb",
                  padding: "12px",
                }}>
                  <img
                    alt={t("facilityReport.uploadedImageAlt")}
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
                label="Heart Rate" 
                value={`${report.measurements.heartRateBpm} bpm`}
                icon={<Activity size={16} color="#2563eb" />}
              />
              <Field 
                label="Rhythm" 
                value={report.measurements.rhythm}
                icon={<Activity size={16} color="#2563eb" />}
              />
              <Field 
                label="PR Interval" 
                value={`${report.measurements.prMs} ms`}
                icon={<Activity size={16} color="#2563eb" />}
              />
              <Field 
                label="QRS Duration" 
                value={`${report.measurements.qrsMs} ms`}
                icon={<Activity size={16} color="#2563eb" />}
              />
              <Field 
                label="QT Interval" 
                value={`${report.measurements.qtMs} ms`}
                icon={<Activity size={16} color="#2563eb" />}
              />
              <Field 
                label="QTc Interval" 
                value={`${report.measurements.qtcMs} ms`}
                icon={<Activity size={16} color="#2563eb" />}
              />
            </div>

            <div style={{
              padding: "20px",
              borderRadius: "12px",
              background: report.abnormalities && report.abnormalities.length > 0 
                ? "#fef2f2" 
                : "#f0fdf4",
              border: `1px solid ${report.abnormalities && report.abnormalities.length > 0 
                ? "#fecaca" 
                : "#bbf7d0"}`,
            }}>
              <h3 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                color: "#1e293b",
                margin: "0 0 12px 0",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                {report.abnormalities && report.abnormalities.length > 0 ? (
                  <AlertCircle size={20} color="#dc2626" />
                ) : (
                  <CheckCircle2 size={20} color="#16a34a" />
                )}
                Abnormalities
              </h3>
              {report.abnormalities?.length ? (
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: "24px", 
                  color: "#991b1b",
                  fontSize: "14px",
                  lineHeight: "1.8"
                }}>
                  {(report.abnormalities || []).map((a, i) => (
                    <li key={i} style={{ marginBottom: "6px" }}>{a}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: "#166534", fontSize: "14px" }}>
                  {t("facilityReport.sections.noAbnormalities")}
                </div>
              )}
            </div>

            <div style={{
              padding: "20px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}>
              <h3 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                color: "#1e293b",
                margin: "0 0 12px 0"
              }}>
                {t("facilityReport.sections.clinicalImpression")}
              </h3>
              <p style={{ 
                color: "#374151", 
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
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#1e293b",
                  margin: "0 0 12px 0"
                }}>
                  {t("facilityReport.sections.recommendations")}
                </h3>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: "24px", 
                  color: "#1e40af",
                  fontSize: "14px",
                  lineHeight: "1.8"
                }}>
                  {(report.recommendations || []).map((rec, i) => (
                    <li key={i} style={{ marginBottom: "6px" }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.decisionExplanations && report.decisionExplanations.length > 0 && (
              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#1e293b",
                  margin: "0 0 16px 0"
                }}>
                  {t("facilityReport.sections.decisionExplanation")}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {(report.decisionExplanations || []).map((exp, i) => (
                    <div key={i} style={{ 
                      padding: "16px", 
                      background: "#ffffff", 
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ 
                        fontWeight: "600", 
                        marginBottom: "10px", 
                        color: "#2563eb",
                        fontSize: "16px"
                      }}>
                        {exp.finding}
                      </div>
                      <div style={{ fontSize: "14px", marginBottom: "6px", color: "#374151" }}>
                        <strong style={{ color: "#1e293b" }}>{t("facilityReport.decision.evidence")}</strong> {exp.evidence}
                      </div>
                      {exp.normalRange && (
                        <div style={{ fontSize: "14px", marginBottom: "6px", color: "#374151" }}>
                          <strong style={{ color: "#1e293b" }}>{t("facilityReport.decision.normalRange")}</strong> {exp.normalRange}
                        </div>
                      )}
                      {exp.deviation && (
                        <div style={{ fontSize: "14px", marginBottom: "6px", color: "#374151" }}>
                          <strong style={{ color: "#1e293b" }}>{t("facilityReport.decision.deviation")}</strong> {exp.deviation}
                        </div>
                      )}
                      {exp.confidence && (
                        <div style={{ fontSize: "14px", color: "#374151" }}>
                          <strong style={{ color: "#1e293b" }}>{t("facilityReport.decision.confidence")}</strong>{" "}
                          <span style={{ 
                            color: exp.confidence.toLowerCase().includes("high") ? "#16a34a" : 
                                   exp.confidence.toLowerCase().includes("medium") ? "#f59e0b" : "#dc2626",
                            fontWeight: "600"
                          }}>
                            {exp.confidence}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.patient && (
              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#1e293b",
                  margin: "0 0 16px 0"
                }}>
                  {t("facilityReport.sections.patientInfo")}
                </h3>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "16px"
                }}>
                  <Field label={t("facilityReport.fields.name")} value={report.patient.name} />
                  <Field label={t("facilityReport.fields.age")} value={t("facilityReport.fields.ageValue", { age: report.patient.age })} />
                  <Field label={t("facilityReport.fields.sex")} value={report.patient.sex} />
                  {report.patient.medicalRecordNumber && (
                    <Field label={t("facilityReport.fields.mrn")} value={report.patient.medicalRecordNumber} />
                  )}
                  {report.patient.clinicalIndication && (
                    <Field label={t("facilityReport.fields.clinicalIndication")} value={report.patient.clinicalIndication} />
                  )}
                  {report.patient.medications && report.patient.medications.length > 0 && (
                    <Field 
                      label={t("facilityReport.fields.medications")} 
                      value={report.patient.medications.join(", ")} 
                    />
                  )}
                </div>
              </div>
            )}

            {report.signalPreview?.normalized?.length ? (
              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}>
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#1e293b",
                  margin: "0 0 16px 0"
                }}>
                  {t("facilityReport.sections.waveform")}
                </h3>
                <Waveform
                  title={t("facilityReport.sections.waveformTitle")}
                  samples={report.signalPreview.normalized}
                  rPeaks={rPeaksPreview}
                />
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </div>

      {/* WhatsApp Forward Modal */}
      {showWhatsAppModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: "0 0 4px 0" }}>
                  {t("facilityReport.whatsapp.title")}
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                  {t("facilityReport.whatsapp.subtitle")}
                </p>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={16} />
                    {t("facilityReport.whatsapp.physicianName")}
                  </div>
                </label>
                <input
                  type="text"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  placeholder={t("facilityReport.whatsapp.physicianPlaceholder")}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#25D366";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 211, 102, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={16} />
                    {t("facilityReport.whatsapp.phoneNumber")}
                  </div>
                </label>
                <input
                  type="tel"
                  value={physicianPhone}
                  onChange={(e) => setPhysicianPhone(e.target.value)}
                  placeholder={t("facilityReport.whatsapp.phonePlaceholder")}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#25D366";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 211, 102, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                  Include country code (e.g., +1 for US, +44 for UK)
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontSize: "13px", color: "#166534", lineHeight: "1.6" }}>
                  <strong>{t("facilityReport.whatsapp.summary.title")}</strong>
                  <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                    <li>{t("facilityReport.whatsapp.summary.patientNameDate")}</li>
                    <li>{t("facilityReport.whatsapp.summary.keyMeasurements")}</li>
                    <li>{t("facilityReport.whatsapp.summary.abnormalities")}</li>
                    <li>{t("facilityReport.whatsapp.summary.clinicalImpression")}</li>
                    <li>{t("facilityReport.whatsapp.summary.reportLink")}</li>
                  </ul>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setPhysicianName("");
                    setPhysicianPhone("");
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#f1f5f9",
                    color: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                >
                  {t("facilityReport.whatsapp.cancel")}
                </button>
                <button
                  onClick={handleForwardToWhatsApp}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#25D366",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#20BA5A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#25D366";
                  }}
                >
                  <Send size={18} />
                  {t("facilityReport.whatsapp.open")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

