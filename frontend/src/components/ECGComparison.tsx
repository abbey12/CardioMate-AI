import { useState } from "react";
import { Eye, Download, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { EcgStructuredReport } from "../ui/types";
import { downloadReportPdf } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

interface ECGComparisonProps {
  currentEcg: EcgStructuredReport;
  priorEcg: EcgStructuredReport;
  onClose?: () => void;
}

export function ECGComparison({ currentEcg, priorEcg, onClose }: ECGComparisonProps) {
  const { token, onTokenRefresh } = useAuth();
  const navigate = useNavigate();

  const handleDownloadPdf = async (reportId: string) => {
    if (!token) return;
    try {
      await downloadReportPdf(token, reportId, onTokenRefresh || (() => {}));
    } catch (error: any) {
      alert(error?.message || "Failed to download PDF");
    }
  };

  // Calculate changes
  const hrChange = currentEcg.measurements.heartRateBpm && priorEcg.measurements.heartRateBpm
    ? currentEcg.measurements.heartRateBpm - priorEcg.measurements.heartRateBpm
    : null;
  
  const prChange = currentEcg.measurements.prMs && priorEcg.measurements.prMs
    ? currentEcg.measurements.prMs - priorEcg.measurements.prMs
    : null;
  
  const qrsChange = currentEcg.measurements.qrsMs && priorEcg.measurements.qrsMs
    ? currentEcg.measurements.qrsMs - priorEcg.measurements.qrsMs
    : null;
  
  const qtcChange = currentEcg.measurements.qtcMs && priorEcg.measurements.qtcMs
    ? currentEcg.measurements.qtcMs - priorEcg.measurements.qtcMs
    : null;

  // Find new, resolved, and changed abnormalities
  const priorAbnormalities = new Set(priorEcg.abnormalities || []);
  const currentAbnormalities = new Set(currentEcg.abnormalities || []);
  
  const newAbnormalities = Array.from(currentAbnormalities).filter(a => !priorAbnormalities.has(a));
  const resolvedAbnormalities = Array.from(priorAbnormalities).filter(a => !currentAbnormalities.has(a));
  const commonAbnormalities = Array.from(currentAbnormalities).filter(a => priorAbnormalities.has(a));

  const getChangeIndicator = (change: number | null, reverse: boolean = false) => {
    if (change === null) return null;
    const isPositive = reverse ? change < 0 : change > 0;
    const isNegative = reverse ? change > 0 : change < 0;
    
    if (isPositive) {
      return <TrendingUp size={16} style={{ color: reverse ? "#10b981" : "#ef4444" }} />;
    } else if (isNegative) {
      return <TrendingDown size={16} style={{ color: reverse ? "#ef4444" : "#10b981" }} />;
    } else {
      return <Minus size={16} style={{ color: "#94a3b8" }} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          maxWidth: "1400px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "24px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 10,
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
            ECG Comparison
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: "8px",
              }}
            >
              <Eye size={20} />
            </button>
          )}
        </div>

        {/* Comparison Content */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Prior ECG */}
            <div style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Prior ECG</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>
                  {formatDate(priorEcg.createdAt)}
                </div>
              </div>

              {/* Measurements */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Heart Rate</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {priorEcg.measurements.heartRateBpm || "—"} bpm
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Rhythm</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {priorEcg.measurements.rhythm || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>PR Interval</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {priorEcg.measurements.prMs || "—"} ms
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>QRS Duration</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {priorEcg.measurements.qrsMs || "—"} ms
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>QTc</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {priorEcg.measurements.qtcMs || "—"} ms
                  </span>
                </div>
              </div>

              {/* Abnormalities */}
              {priorEcg.abnormalities && priorEcg.abnormalities.length > 0 ? (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>
                    Abnormalities
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {priorEcg.abnormalities.map((abnormality, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 8px",
                          background: "#fef2f2",
                          color: "#dc2626",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {abnormality}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <CheckCircle2 size={16} />
                  No abnormalities detected
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => navigate(`/facility/reports/${priorEcg.id}`)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "14px",
                    color: "#1e293b",
                  }}
                >
                  <Eye size={16} />
                  View Full
                </button>
                <button
                  onClick={() => handleDownloadPdf(priorEcg.id)}
                  style={{
                    padding: "10px",
                    background: "#fef2f2",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "14px",
                    color: "#dc2626",
                  }}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Current ECG */}
            <div style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              border: "2px solid #dc2626",
            }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Current ECG</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>
                  {formatDate(currentEcg.createdAt)}
                </div>
              </div>

              {/* Measurements with Changes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Heart Rate</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                      {currentEcg.measurements.heartRateBpm || "—"} bpm
                    </span>
                    {hrChange !== null && (
                      <>
                        {getChangeIndicator(hrChange)}
                        <span style={{ fontSize: "12px", color: hrChange > 0 ? "#ef4444" : "#10b981" }}>
                          {hrChange > 0 ? "+" : ""}{hrChange}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Rhythm</span>
                  <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {currentEcg.measurements.rhythm || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>PR Interval</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                      {currentEcg.measurements.prMs || "—"} ms
                    </span>
                    {prChange !== null && (
                      <>
                        {getChangeIndicator(prChange)}
                        <span style={{ fontSize: "12px", color: Math.abs(prChange) > 20 ? "#ef4444" : "#64748b" }}>
                          {prChange > 0 ? "+" : ""}{prChange}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>QRS Duration</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                      {currentEcg.measurements.qrsMs || "—"} ms
                    </span>
                    {qrsChange !== null && (
                      <>
                        {getChangeIndicator(qrsChange)}
                        <span style={{ fontSize: "12px", color: Math.abs(qrsChange) > 10 ? "#ef4444" : "#64748b" }}>
                          {qrsChange > 0 ? "+" : ""}{qrsChange}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>QTc</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                      {currentEcg.measurements.qtcMs || "—"} ms
                    </span>
                    {qtcChange !== null && (
                      <>
                        {getChangeIndicator(qtcChange)}
                        <span style={{ fontSize: "12px", color: Math.abs(qtcChange) > 30 ? "#ef4444" : "#64748b" }}>
                          {qtcChange > 0 ? "+" : ""}{qtcChange}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Abnormalities with Changes */}
              {currentEcg.abnormalities && currentEcg.abnormalities.length > 0 ? (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>
                    Abnormalities
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {newAbnormalities.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#dc2626", marginBottom: "4px" }}>
                          NEW
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {newAbnormalities.map((abnormality, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: "4px 8px",
                                background: "#fee2e2",
                                color: "#991b1b",
                                borderRadius: "4px",
                                fontSize: "12px",
                                border: "1px solid #dc2626",
                              }}
                            >
                              {abnormality}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {commonAbnormalities.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                          PERSISTENT
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {commonAbnormalities.map((abnormality, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: "4px 8px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            >
                              {abnormality}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <CheckCircle2 size={16} />
                  No abnormalities detected
                </div>
              )}

              {/* Resolved Abnormalities */}
              {resolvedAbnormalities.length > 0 && (
                <div style={{
                  marginBottom: "20px",
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#16a34a", marginBottom: "8px" }}>
                    RESOLVED
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {resolvedAbnormalities.map((abnormality, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 8px",
                          background: "white",
                          color: "#16a34a",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {abnormality}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => navigate(`/facility/reports/${currentEcg.id}`)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#fef2f2",
                    border: "1px solid #dc2626",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "14px",
                    color: "#dc2626",
                    fontWeight: "600",
                  }}
                >
                  <Eye size={16} />
                  View Full
                </button>
                <button
                  onClick={() => handleDownloadPdf(currentEcg.id)}
                  style={{
                    padding: "10px",
                    background: "#fef2f2",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "14px",
                    color: "#dc2626",
                  }}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div style={{
            marginTop: "24px",
            padding: "20px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "16px" }}>
              Comparison Summary
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              {newAbnormalities.length > 0 && (
                <div style={{
                  padding: "12px",
                  background: "#fee2e2",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#991b1b", marginBottom: "4px" }}>
                    New Findings
                  </div>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {newAbnormalities.length} new abnormalit{newAbnormalities.length > 1 ? "ies" : "y"} detected
                  </div>
                </div>
              )}
              {resolvedAbnormalities.length > 0 && (
                <div style={{
                  padding: "12px",
                  background: "#dcfce7",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                    Resolved Findings
                  </div>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {resolvedAbnormalities.length} abnormalit{resolvedAbnormalities.length > 1 ? "ies" : "y"} resolved
                  </div>
                </div>
              )}
              {hrChange !== null && (
                <div style={{
                  padding: "12px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                    Heart Rate Change
                  </div>
                  <div style={{ fontSize: "14px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                    {getChangeIndicator(hrChange)}
                    <span>{hrChange > 0 ? "+" : ""}{hrChange} bpm</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

