import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getPatient,
  getPatientEcgs,
  type PatientWithStats,
} from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Activity,
  Heart,
  Clock,
  Eye,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { downloadReportPdf } from "../../lib/api";
import type { EcgStructuredReport } from "../../ui/types";
import { ECGComparison } from "../../components/ECGComparison";

export function FacilityPatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const { token, isFacility, logout, onTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [comparisonEcg1, setComparisonEcg1] = useState<EcgStructuredReport | null>(null);
  const [comparisonEcg2, setComparisonEcg2] = useState<EcgStructuredReport | null>(null);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  // Fetch patient with stats
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<PatientWithStats>({
    queryKey: ["patient", patientId],
    queryFn: () => {
      if (!token || !patientId) throw new Error("Missing token or patient ID");
      return getPatient(token, patientId, true, handleTokenRefresh);
    },
    enabled: !!token && isFacility && !!patientId,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch patient ECGs
  const { data: ecgsData, isLoading: ecgsLoading } = useQuery({
    queryKey: ["patientEcgs", patientId],
    queryFn: () => {
      if (!token || !patientId) throw new Error("Missing token or patient ID");
      return getPatientEcgs(token, patientId, 100, 0, handleTokenRefresh);
    },
    enabled: !!token && isFacility && !!patientId,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  const handleDownloadPdf = async (reportId: string) => {
    if (!token) return;
    try {
      await downloadReportPdf(token, reportId, handleTokenRefresh);
    } catch (error: any) {
      alert(error?.message || "Failed to download PDF");
    }
  };

  if (patientLoading || ecgsLoading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Loader2 size={32} style={{ color: "#dc2626", animation: "spin 1s linear infinite", display: "inline-block" }} />
        </div>
      </Layout>
    );
  }

  if (patientError || !patient) {
    return (
      <Layout>
        <div style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ color: "#ef4444" }}>Error loading patient: {(patientError as Error)?.message || "Patient not found"}</p>
          <button
            onClick={() => navigate("/facility/patients")}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Back to Patients
          </button>
        </div>
      </Layout>
    );
  }

  const ecgs = ecgsData?.reports || [];

  return (
    <Layout>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <button
            onClick={() => navigate("/facility/patients")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              padding: "8px 16px",
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            <ArrowLeft size={16} />
            Back to Patients
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
                {patient.name}
              </h1>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "16px" }}>
                {patient.medicalRecordNumber && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px" }}>
                    <FileText size={16} />
                    <span>MRN: {patient.medicalRecordNumber}</span>
                  </div>
                )}
                {patient.age && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px" }}>
                    <User size={16} />
                    <span>Age: {patient.age}</span>
                  </div>
                )}
                {patient.sex && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px" }}>
                    <span>Sex: {patient.sex}</span>
                  </div>
                )}
                {patient.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "14px" }}>
                    <span>Phone: {patient.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{
              padding: "16px 24px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>{patient.totalEcgs}</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Total ECGs</div>
            </div>
          </div>
        </div>

        {/* ECG Timeline */}
        {ecgs.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "64px",
              textAlign: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <FileText size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
            <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "8px" }}>
              No ECG records found for this patient
            </p>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              Upload an ECG for this patient to get started
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {ecgs.map((ecg: EcgStructuredReport, index: number) => {
              const previousEcg = index > 0 ? ecgs[index - 1] : null;
              const hrChange = previousEcg
                ? ecg.measurements.heartRateBpm - previousEcg.measurements.heartRateBpm
                : null;
              const hrTrend = hrChange !== null
                ? hrChange > 0
                  ? "up"
                  : hrChange < 0
                  ? "down"
                  : "stable"
                : null;

              return (
                <div
                  key={ecg.id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "24px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: index === 0 ? "#10b981" : "#94a3b8",
                        }} />
                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                          ECG #{ecgs.length - index} - {new Date(ecg.createdAt).toLocaleDateString()}
                        </h3>
                        {index === 0 && (
                          <span style={{
                            padding: "4px 8px",
                            background: "#f0fdf4",
                            color: "#16a34a",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}>
                            Latest
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "16px", marginLeft: "20px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "14px" }}>
                          <Heart size={16} />
                          <span>HR: {ecg.measurements.heartRateBpm} bpm</span>
                          {hrTrend && (
                            <span style={{ marginLeft: "4px" }}>
                              {hrTrend === "up" && <TrendingUp size={14} style={{ color: "#ef4444" }} />}
                              {hrTrend === "down" && <TrendingDown size={14} style={{ color: "#10b981" }} />}
                              {hrTrend === "stable" && <Minus size={14} style={{ color: "#94a3b8" }} />}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "14px" }}>
                          <Activity size={16} />
                          <span>{ecg.measurements.rhythm}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "14px" }}>
                          <Clock size={16} />
                          <span>{new Date(ecg.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {index > 0 && (
                        <button
                          onClick={() => {
                            setComparisonEcg1(ecgs[index - 1]);
                            setComparisonEcg2(ecg);
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "14px",
                            color: "#16a34a",
                            fontWeight: "600",
                          }}
                          title="Compare with previous ECG"
                        >
                          <ArrowRight size={16} />
                          Compare
                        </button>
                      )}
                      <Link
                        to={`/facility/reports/${ecg.id}`}
                        style={{
                          padding: "8px 16px",
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "14px",
                          color: "#1e293b",
                          textDecoration: "none",
                        }}
                      >
                        <Eye size={16} />
                        View
                      </Link>
                      <button
                        onClick={() => handleDownloadPdf(ecg.id)}
                        style={{
                          padding: "8px 16px",
                          background: "#fef2f2",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "14px",
                          color: "#dc2626",
                        }}
                      >
                        <Download size={16} />
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* Key Findings */}
                  {ecg.abnormalities && ecg.abnormalities.length > 0 && (
                    <div style={{
                      marginTop: "16px",
                      padding: "12px",
                      background: "#fef2f2",
                      borderRadius: "8px",
                      border: "1px solid #fecaca",
                    }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#991b1b", marginBottom: "8px" }}>
                        Abnormalities Detected:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {ecg.abnormalities.map((abnormality, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: "4px 8px",
                              background: "white",
                              borderRadius: "4px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {abnormality}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical Impression Preview */}
                  {ecg.clinicalImpression && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      fontSize: "14px",
                      color: "#64748b",
                    }}>
                      <strong style={{ color: "#1e293b" }}>Clinical Impression: </strong>
                      {ecg.clinicalImpression.length > 150
                        ? `${ecg.clinicalImpression.substring(0, 150)}...`
                        : ecg.clinicalImpression}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison Modal */}
        {comparisonEcg1 && comparisonEcg2 && (
          <ECGComparison
            currentEcg={comparisonEcg2}
            priorEcg={comparisonEcg1}
            onClose={() => {
              setComparisonEcg1(null);
              setComparisonEcg2(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}

