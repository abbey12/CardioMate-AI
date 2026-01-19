import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { uploadEcg, downloadReportPdf, getFacilityWallet, searchPatients, getPatient, getPricing, createPatient, type Patient, type CreatePatientData } from "../../lib/api";
import type { EcgStructuredReport, PatientInfo } from "../../ui/types";
import { Waveform } from "../../ui/Waveform";
import { Layout } from "../../components/layout/Layout";
import { useTranslation } from "react-i18next";
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Eye,
  Loader2,
  User,
  Activity,
  Pill,
  FileCheck,
  UserPlus,
  Users,
  Wallet,
  Info,
  Link as LinkIcon
} from "lucide-react";
import "../../ui/styles.css";

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

export function FacilityUpload() {
  const { token, isFacility, logout, onTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sampleRateHz, setSampleRateHz] = useState<number>(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EcgStructuredReport | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get wallet for currency display in error messages
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return getFacilityWallet(token, onTokenRefresh);
    },
    enabled: !!token && isFacility,
    retry: false,
  });

  // Get pricing for display
  const { data: pricing } = useQuery({
    queryKey: ["pricing"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return getPricing(token, onTokenRefresh);
    },
    enabled: !!token && isFacility,
    retry: false,
  });
  
  // Patient selection: "new" or "existing"
  const [patientSelectionMode, setPatientSelectionMode] = useState<"new" | "existing">("new");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");
  const [showPatientSearch, setShowPatientSearch] = useState<boolean>(false);
  
  const [patientInfo, setPatientInfo] = useState<Partial<PatientInfo>>({
    name: "",
    age: undefined,
    sex: "unknown",
    medicalRecordNumber: "",
    clinicalIndication: "",
    medications: [],
  });
  const [medicationInput, setMedicationInput] = useState<string>("");

  // Search patients for selection
  const { data: searchResults, isLoading: searchingPatients } = useQuery({
    queryKey: ["patientSearch", patientSearchQuery],
    queryFn: () => {
      if (!token || !patientSearchQuery || patientSearchQuery.length < 2) return Promise.resolve([]);
      return searchPatients(token, patientSearchQuery, 10, handleTokenRefresh);
    },
    enabled: !!token && isFacility && patientSearchQuery.length >= 2 && showPatientSearch,
    retry: false,
  });

  // Get selected patient details
  const { data: selectedPatient } = useQuery({
    queryKey: ["patient", selectedPatientId],
    queryFn: () => {
      if (!token || !selectedPatientId) return null;
      return getPatient(token, selectedPatientId, false, handleTokenRefresh);
    },
    enabled: !!token && isFacility && !!selectedPatientId,
    retry: false,
  });

  const rPeaksPreview = useMemo(() => {
    if (!report?.preprocess?.rPeakIndices || !report?.signalPreview?.normalized)
      return [];
    const limit = report.signalPreview.normalized.length;
    return report.preprocess.rPeakIndices.filter((i) => i >= 0 && i < limit);
  }, [report]);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  async function onUpload(): Promise<void> {
    if (!file || !token) return;
    
    // Validate based on selection mode
    if (patientSelectionMode === "existing") {
      if (!selectedPatientId) {
        setError("Please select a patient");
        return;
      }
    } else {
      if (!patientInfo.name || patientInfo.name.trim() === "") {
        setError(t("facilityUpload.errors.requiredPatientInfo"));
        return;
      }
    }

    setBusy(true);
    setError(null);
    setReport(null);
    try {
      let uploadOptions: { file: File; sampleRateHz?: number; patient?: PatientInfo; patientId?: string };
      let finalPatientId: string | undefined;
      
      if (patientSelectionMode === "existing" && selectedPatientId) {
        // Upload with existing patient ID
        finalPatientId = selectedPatientId;
        uploadOptions = { file, sampleRateHz, patientId: finalPatientId };
      } else {
        // Create the patient first, then upload with patient ID
        if (!patientInfo.name || patientInfo.name.trim() === "") {
          setError("Patient name is required");
          setBusy(false);
          return;
        }
        
        const patientData: CreatePatientData = {
          name: patientInfo.name.trim(),
          age: patientInfo.age || null,
          sex: (patientInfo.sex && patientInfo.sex !== "unknown") ? patientInfo.sex as "male" | "female" | "other" : null,
          medicalRecordNumber: patientInfo.medicalRecordNumber?.trim() || null,
          phone: null,
          email: null,
          address: null,
          primaryDiagnosis: patientInfo.clinicalIndication?.trim() || null,
          medications: patientInfo.medications && patientInfo.medications.length > 0 ? patientInfo.medications : null,
          comorbidities: null,
          allergies: null,
        };
        
        // Create the patient
        const createdPatient = await createPatient(token, patientData, handleTokenRefresh);
        finalPatientId = createdPatient.id;
        
        // Invalidate patient queries so the patient list updates
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        
        // Upload with the created patient ID
        uploadOptions = { file, sampleRateHz, patientId: finalPatientId };
      }
      
      const r = await uploadEcg(token, uploadOptions, handleTokenRefresh);
      setReport(r);
    } catch (e: any) {
      if (e?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
      } else if (e?.status === 402 || e?.message?.includes("Insufficient balance") || (e as any)?.error === "Insufficient balance") {
        let errorData: any = {};
        try {
          if (e?.response?.json) {
            errorData = await e.response.json();
          } else if (e?.message) {
            // Try to parse error message if it contains JSON
            const match = e.message.match(/\{.*\}/);
            if (match) {
              errorData = JSON.parse(match[0]);
            }
          }
        } catch {}
        const requiredAmount = errorData?.requiredAmount;
        const currentBalance = errorData?.currentBalance;
        const currency = wallet?.currency || "GHS";
        const currencySymbol = currency === "GHS" ? "₵" : "$";
        
        setError(
          errorData?.message || e?.message || 
          `Insufficient balance. You need ${currencySymbol}${requiredAmount?.toFixed(2) || "funds"} to perform this analysis. Your current balance is ${currencySymbol}${currentBalance?.toFixed(2) || "0.00"}. Please top up your wallet.`
        );
      } else {
        setError(e?.message ?? t("facilityUpload.errors.uploadFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadPdf(): Promise<void> {
    if (!report || !token) return;
    try {
      await downloadReportPdf(token, report.id);
    } catch (e: any) {
      setError(e?.message ?? t("facilityUpload.errors.downloadFailed"));
    }
  }

  function addMedication(): void {
    if (!medicationInput.trim()) return;
    setPatientInfo({
      ...patientInfo,
      medications: [...(patientInfo.medications || []), medicationInput.trim()],
    });
    setMedicationInput("");
  }

  function removeMedication(index: number): void {
    setPatientInfo({
      ...patientInfo,
      medications: patientInfo.medications?.filter((_, i) => i !== index) || [],
    });
  }

  function handleFileSelect(f: File | null) {
    setFile(f);
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    if (f && f.type.startsWith("image/")) {
      setLocalImageUrl(URL.createObjectURL(f));
    } else {
      setLocalImageUrl(null);
    }
    setError(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }

  if (!isFacility || !token) {
    return null;
  }

  return (
    <Layout>
      <div>
        {/* Page Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
                {t("facilityUpload.title")}
              </h1>
              <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
                {t("facilityUpload.subtitle")}
              </p>
            </div>
            
            {/* Wallet Balance & Pricing Info */}
            {wallet && (
              <div style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "16px 20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                minWidth: "220px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Wallet size={18} color="#10b981" />
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                    Wallet Balance
                  </span>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#10b981", marginBottom: "4px" }}>
                  {wallet.currency === "GHS" ? "₵" : "$"}{Number(wallet.balance || 0).toFixed(2)}
                </div>
                {pricing && file && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Info size={12} />
                    <span>
                      {file.type?.startsWith("image/") ? (
                        <span>Image: {wallet.currency === "GHS" ? "₵" : "$"}{(pricing.image || 0).toFixed(2)}</span>
                      ) : (
                        <span>Standard: {wallet.currency === "GHS" ? "₵" : "$"}{(pricing.standard || 0).toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                )}
                {wallet && pricing && Number(wallet.balance || 0) < (file?.type?.startsWith("image/") ? pricing.image : pricing.standard) && (
                  <a
                    href="/facility/wallet"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "#dc2626",
                      textDecoration: "none",
                      marginTop: "8px",
                      fontWeight: "600",
                    }}
                  >
                    <LinkIcon size={12} />
                    Top Up Wallet
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Patient Information Card */}
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                marginBottom: "6px"
              }}>
                <User size={20} color="#dc2626" />
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                  {t("facilityUpload.patientInfo.title")}
                </h2>
              </div>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                {t("facilityUpload.patientInfo.subtitle")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Patient Selection Mode Toggle */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ 
                  display: "flex", 
                  gap: "12px", 
                  background: "#f8fafc",
                  padding: "6px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientSelectionMode("new");
                      setSelectedPatientId(null);
                      setPatientSearchQuery("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: patientSelectionMode === "new" ? "#ffffff" : "transparent",
                      color: patientSelectionMode === "new" ? "#dc2626" : "#64748b",
                      fontWeight: patientSelectionMode === "new" ? "600" : "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      boxShadow: patientSelectionMode === "new" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    <UserPlus size={18} />
                    New Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientSelectionMode("existing");
                      setPatientInfo({ name: "", age: undefined, sex: "unknown", medicalRecordNumber: "", clinicalIndication: "", medications: [] });
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: patientSelectionMode === "existing" ? "#ffffff" : "transparent",
                      color: patientSelectionMode === "existing" ? "#dc2626" : "#64748b",
                      fontWeight: patientSelectionMode === "existing" ? "600" : "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      boxShadow: patientSelectionMode === "existing" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    <Users size={18} />
                    Existing Patient
                  </button>
                </div>
              </div>

              {/* Existing Patient Search */}
              {patientSelectionMode === "existing" && (
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px"
                  }}>
                    Search Patient <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        setShowPatientSearch(true);
                      }}
                      onFocus={(e) => {
                        setShowPatientSearch(true);
                        e.currentTarget.style.borderColor = "#dc2626";
                        e.currentTarget.style.outline = "none";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                      }}
                      placeholder="Search by name, MRN, phone, or email..."
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        paddingRight: "40px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        transition: "all 0.2s",
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.boxShadow = "none";
                        // Delay hiding search to allow click
                        setTimeout(() => setShowPatientSearch(false), 200);
                      }}
                    />
                    <User size={18} style={{ 
                      position: "absolute", 
                      right: "12px", 
                      top: "50%", 
                      transform: "translateY(-50%)",
                      color: "#94a3b8"
                    }} />
                    
                    {/* Search Results Dropdown */}
                    {showPatientSearch && patientSearchQuery.length >= 2 && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        marginTop: "4px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                      }}>
                        {searchingPatients ? (
                          <div style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", display: "inline-block" }} />
                          </div>
                        ) : searchResults && searchResults.length > 0 ? (
                          searchResults.map((patient) => (
                            <div
                              key={patient.id}
                              onClick={() => {
                                setSelectedPatientId(patient.id);
                                setPatientSearchQuery(patient.name);
                                setShowPatientSearch(false);
                              }}
                              style={{
                                padding: "12px 16px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f8fafc";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#ffffff";
                              }}
                            >
                              <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                                {patient.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                {patient.age && `Age: ${patient.age} • `}
                                {patient.sex && `${patient.sex} • `}
                                {patient.medicalRecordNumber && `MRN: ${patient.medicalRecordNumber}`}
                              </div>
                            </div>
                          ))
                        ) : patientSearchQuery.length >= 2 ? (
                          <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                            No patients found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Patient Display */}
                  {selectedPatientId && selectedPatient && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "#f0fdf4",
                      borderRadius: "8px",
                      border: "1px solid #86efac",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                          {selectedPatient.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#16a34a" }}>
                          {selectedPatient.age && `Age: ${selectedPatient.age} • `}
                          {selectedPatient.sex && `${selectedPatient.sex}`}
                          {selectedPatient.medicalRecordNumber && ` • MRN: ${selectedPatient.medicalRecordNumber}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(null);
                          setPatientSearchQuery("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#16a34a",
                          padding: "4px",
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* New Patient Form Fields */}
              {patientSelectionMode === "new" && (
                <>
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.name")} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={patientInfo.name || ""}
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  placeholder={t("facilityUpload.patientInfo.placeholders.name")}
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
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.age")} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={patientInfo.age ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : Number(e.target.value);
                    setPatientInfo({ ...patientInfo, age: value });
                  }}
                  placeholder={t("facilityUpload.patientInfo.placeholders.age")}
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
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.sex")} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={patientInfo.sex || "unknown"}
                  onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value as any })}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="unknown">{t("facilityUpload.patientInfo.options.selectSex")}</option>
                  <option value="male">{t("facilityUpload.patientInfo.options.male")}</option>
                  <option value="female">{t("facilityUpload.patientInfo.options.female")}</option>
                  <option value="other">{t("facilityUpload.patientInfo.options.other")}</option>
                </select>
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.mrn")}
                </label>
                <input
                  type="text"
                  value={patientInfo.medicalRecordNumber || ""}
                  onChange={(e) => setPatientInfo({ ...patientInfo, medicalRecordNumber: e.target.value })}
                  placeholder={t("facilityUpload.patientInfo.placeholders.mrn")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.clinicalIndication")}
                </label>
                <input
                  type="text"
                  value={patientInfo.clinicalIndication || ""}
                  onChange={(e) => setPatientInfo({ ...patientInfo, clinicalIndication: e.target.value })}
                  placeholder={t("facilityUpload.patientInfo.placeholders.clinicalIndication")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.patientInfo.fields.medications")}
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={medicationInput}
                    onChange={(e) => setMedicationInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                    placeholder={t("facilityUpload.patientInfo.placeholders.medications")}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      transition: "all 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#2563eb";
                      e.currentTarget.style.outline = "none";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={addMedication}
                    style={{
                      padding: "12px 20px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#2563eb";
                    }}
                  >
                    <Pill size={16} />
                    Add
                  </button>
                </div>
                {patientInfo.medications && patientInfo.medications.length > 0 && (
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {patientInfo.medications.map((med, i) => (
                      <span key={i} style={{ 
                        background: "#eff6ff", 
                        padding: "6px 12px", 
                        borderRadius: "6px",
                        fontSize: "13px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#1e40af",
                        fontWeight: "500",
                        border: "1px solid #bfdbfe",
                      }}>
                        {med}
                        <button
                          type="button"
                          onClick={() => removeMedication(i)}
                          style={{ 
                            background: "none", 
                            border: "none", 
                            cursor: "pointer",
                            color: "#1e40af",
                            fontSize: "16px",
                            padding: 0,
                            width: "18px",
                            height: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#dbeafe";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "none";
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>

          {/* Upload ECG Card */}
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                marginBottom: "6px"
              }}>
                <Upload size={20} color="#2563eb" />
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                  {t("facilityUpload.uploadCard.title")}
                </h2>
              </div>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                {t("facilityUpload.uploadCard.supported")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "#2563eb" : "#d1d5db"}`,
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragging ? "#eff6ff" : "#f9fafb",
                  transition: "all 0.2s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.background = "#eff6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.png,.jpg,.jpeg,text/csv,application/json,image/png,image/jpeg"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  style={{ display: "none" }}
                />
                {file ? (
                  <div>
                    <FileCheck size={48} color="#10b981" style={{ marginBottom: "12px" }} />
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: "14px", color: "#64748b" }}>
                      {(file.size / 1024).toFixed(2)} KB
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileSelect(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      style={{
                        marginTop: "12px",
                        padding: "6px 12px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <X size={14} />
                      {t("facilityUpload.uploadCard.remove")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={48} color="#64748b" style={{ marginBottom: "12px" }} />
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                      {t("facilityUpload.uploadCard.dropHere")}
                    </div>
                    <div style={{ fontSize: "14px", color: "#64748b" }}>
                      {t("facilityUpload.uploadCard.supportsTypes")}
                    </div>
                  </div>
                )}
              </div>

              {/* Image Preview */}
              {localImageUrl && (
                <div style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#f9fafb",
                  padding: "12px",
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#64748b"
                  }}>
                    <ImageIcon size={16} />
                    {t("facilityUpload.uploadCard.imagePreview")}
                  </div>
                  <img
                    src={localImageUrl}
                    alt={t("facilityUpload.previewAlt")}
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </div>
              )}

              {/* Sample Rate Input */}
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  {t("facilityUpload.uploadCard.sampleRate")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={sampleRateHz}
                  onChange={(e) => setSampleRateHz(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ 
                  marginTop: "6px", 
                  fontSize: "12px", 
                  color: "#64748b" 
                }}>
                  {t("facilityUpload.uploadCard.sampleRateHintPrefix")}{" "}
                  <code style={{ 
                    background: "#f1f5f9", 
                    padding: "2px 6px", 
                    borderRadius: "4px",
                    fontSize: "11px"
                  }}>sampleRateHz</code>{" "}
                  {t("facilityUpload.uploadCard.sampleRateHintSuffix")}
                </div>
              </div>

              {/* Upload Button */}
              <button
                disabled={!file || busy}
                onClick={onUpload}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: busy ? "#94a3b8" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: busy ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => {
                  if (!busy) {
                    e.currentTarget.style.background = "#1d4ed8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!busy) {
                    e.currentTarget.style.background = "#2563eb";
                  }
                }}
              >
                {busy ? (
                  <>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                    {t("facilityUpload.uploadCard.interpreting")}
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    {t("facilityUpload.uploadCard.uploadInterpret")}
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#dc2626",
                }}>
                  <AlertCircle size={20} />
                  <span style={{ fontSize: "14px", fontWeight: "500" }}>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Card - Full Width */}
        {report && (
          <div style={{
            gridColumn: "1 / -1",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginTop: "8px",
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "flex-start",
              marginBottom: "24px",
              paddingBottom: "20px",
              borderBottom: "1px solid #e2e8f0",
            }}>
              <div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  marginBottom: "6px"
                }}>
                  <CheckCircle2 size={24} color="#10b981" />
                  <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                    AI Interpretation Complete
                  </h2>
                </div>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                  Report ID: <code style={{ 
                    background: "#f1f5f9", 
                    padding: "2px 6px", 
                    borderRadius: "4px",
                    fontSize: "12px"
                  }}>{report.id}</code>
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={onDownloadPdf}
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
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => navigate(`/facility/reports/${report.id}`)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#059669";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#10b981";
                  }}
                >
                  <Eye size={18} />
                  View Full Report
                </button>
              </div>
            </div>

            {/* Measurements Grid */}
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

            {/* Abnormalities Section */}
            <div style={{ 
              marginBottom: "24px",
              padding: "20px",
              borderRadius: "12px",
              background: report.abnormalities && report.abnormalities.length > 0 
                ? "#fef2f2" 
                : "#f0fdf4",
              border: `1px solid ${report.abnormalities && report.abnormalities.length > 0 
                ? "#fecaca" 
                : "#bbf7d0"}`,
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                marginBottom: "12px"
              }}>
                {report.abnormalities && report.abnormalities.length > 0 ? (
                  <AlertCircle size={20} color="#dc2626" />
                ) : (
                  <CheckCircle2 size={20} color="#16a34a" />
                )}
                <h3 style={{ 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#1e293b",
                  margin: 0
                }}>
                  Abnormalities
                </h3>
              </div>
              {report.abnormalities && report.abnormalities.length > 0 ? (
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
                  No abnormalities detected. ECG appears normal.
                </div>
              )}
            </div>

            {/* Clinical Impression */}
            <div style={{ 
              marginBottom: "24px",
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
                Clinical Impression
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

            {/* Waveform Preview */}
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
                  {t("facilityUpload.waveformPreview")}
                </h3>
                <Waveform
                  title={t("facilityUpload.waveformPreviewTitle")}
                  samples={report.signalPreview.normalized}
                  rPeaks={rPeaksPreview}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
}

