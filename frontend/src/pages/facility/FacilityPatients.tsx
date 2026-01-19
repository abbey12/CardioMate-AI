import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients,
  type Patient,
  type CreatePatientData,
  type UpdatePatientData,
} from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  Loader2,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function FacilityPatients() {
  const { token, isFacility, logout, onTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<CreatePatientData>({
    name: "",
    age: null,
    sex: null,
    medicalRecordNumber: "",
    phone: "",
    email: "",
    address: "",
    primaryDiagnosis: "",
    comorbidities: [],
    medications: [],
    allergies: [],
  });

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  // Fetch patients
  const { data: patientsData, isLoading, error, refetch } = useQuery({
    queryKey: ["patients", currentPage, pageSize, searchQuery],
    queryFn: () => {
      if (!token) throw new Error("No authentication token");
      return getPatients(
        token,
        {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          search: searchQuery || undefined,
        },
        handleTokenRefresh
      );
    },
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Create patient mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePatientData) => createPatient(token!, data, handleTokenRefresh),
    onSuccess: (data) => {
      // Reset to first page to see the new patient
      setCurrentPage(1);
      // Invalidate all patient queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      // Also refetch immediately
      queryClient.refetchQueries({ queryKey: ["patients"] });
      setShowCreateModal(false);
      setFormData({
        name: "",
        age: null,
        sex: null,
        medicalRecordNumber: "",
        phone: "",
        email: "",
        address: "",
        primaryDiagnosis: "",
        comorbidities: [],
        medications: [],
        allergies: [],
      });
      // Show success message
      if (process.env.NODE_ENV === "development") {
        console.log("Patient created successfully:", data);
      }
    },
    onError: (error: any) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating patient:", error);
        console.error("Error details:", error?.response || error);
      }
      const errorMessage = error?.message || error?.response?.data?.error || t("patients.createError", "Failed to create patient. Please try again.");
      alert(errorMessage);
    },
  });

  // Update patient mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientData }) =>
      updatePatient(token!, id, data, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.refetchQueries({ queryKey: ["patients"] });
      setEditingPatient(null);
      setFormData({
        name: "",
        age: null,
        sex: null,
        medicalRecordNumber: "",
        phone: "",
        email: "",
        address: "",
        primaryDiagnosis: "",
        comorbidities: [],
        medications: [],
        allergies: [],
      });
    },
  });

  // Delete patient mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePatient(token!, id, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.refetchQueries({ queryKey: ["patients"] });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.name.trim()) {
      alert(t("patients.nameRequired", "Name is required"));
      return;
    }
    
    // Clean up the form data - convert empty strings to null for optional fields
    const cleanedData: CreatePatientData = {
      name: formData.name.trim(),
      age: formData.age || null,
      sex: formData.sex || null,
      medicalRecordNumber: formData.medicalRecordNumber?.trim() || null,
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      primaryDiagnosis: formData.primaryDiagnosis?.trim() || null,
      comorbidities: formData.comorbidities && formData.comorbidities.length > 0 ? formData.comorbidities : null,
      medications: formData.medications && formData.medications.length > 0 ? formData.medications : null,
      allergies: formData.allergies && formData.allergies.length > 0 ? formData.allergies : null,
    };
    
    if (process.env.NODE_ENV === "development") {
      console.log("Creating patient with data:", cleanedData);
    }
    
    createMutation.mutate(cleanedData);
  };

  const handleUpdate = () => {
    if (!editingPatient || !formData.name) {
      alert("Name is required");
      return;
    }
    updateMutation.mutate({ id: editingPatient.id, data: formData });
  };

  const handleDelete = (patient: Patient) => {
    if (confirm(`Are you sure you want to delete ${patient.name}?`)) {
      deleteMutation.mutate(patient.id);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age ?? null,
      sex: patient.sex ?? null,
      medicalRecordNumber: patient.medicalRecordNumber ?? "",
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      address: patient.address ?? "",
      primaryDiagnosis: patient.primaryDiagnosis ?? "",
      comorbidities: patient.comorbidities ?? [],
      medications: patient.medications ?? [],
      allergies: patient.allergies ?? [],
    });
    setShowCreateModal(true);
  };

  const handleViewHistory = (patientId: string) => {
    navigate(`/facility/patients/${patientId}`);
  };

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error loading patients:", error);
    }
    return (
      <Layout>
        <div style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
            {t("patients.error", "Error loading patients")}
          </p>
          <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>
            {(error as Error).message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            style={{
              padding: "12px 24px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {t("patients.retry", "Retry")}
          </button>
        </div>
      </Layout>
    );
  }

  if (!isFacility || !token) {
    return null;
  }

  return (
    <Layout>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
                {t("patients.title", "Patient Management")}
              </h1>
              <p style={{ color: "#64748b", fontSize: "16px" }}>
                {t("patients.subtitle", "Manage your patient records and track ECG history")}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPatient(null);
                setFormData({
                  name: "",
                  age: null,
                  sex: null,
                  medicalRecordNumber: "",
                  phone: "",
                  email: "",
                  address: "",
                  primaryDiagnosis: "",
                  comorbidities: [],
                  medications: [],
                  allergies: [],
                });
                setShowCreateModal(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Plus size={20} />
              {t("patients.create", "Create Patient")}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder={t("patients.searchPlaceholder", "Search patients...")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "12px 12px 12px 44px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* Patients Table */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "64px" }}>
            <Loader2 size={32} style={{ color: "#dc2626", animation: "spin 1s linear infinite", display: "inline-block" }} />
            <p style={{ marginTop: "16px", color: "#64748b" }}>{t("patients.loading", "Loading patients...")}</p>
          </div>
        ) : !patientsData ? (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "64px",
              textAlign: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <Users size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
            <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "8px" }}>
              {t("patients.noData", "No data available")}
            </p>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              {t("patients.checkConnection", "Please check your connection and try again")}
            </p>
          </div>
        ) : patientsData?.patients.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "64px",
              textAlign: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <Users size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
            <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "8px" }}>
              {t("patients.noPatients", "No patients found")}
            </p>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              {t("patients.createFirst", "Create your first patient to get started")}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.name", "Name")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.mrn", "MRN")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.age", "Age")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.sex", "Sex")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.phone", "Phone")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                      {t("patients.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(patientsData?.patients || []).map((patient) => (
                    <tr
                      key={patient.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      <td style={{ padding: "16px", fontWeight: "600", color: "#1e293b" }}>{patient.name}</td>
                      <td style={{ padding: "16px", color: "#64748b" }}>{patient.medicalRecordNumber || "—"}</td>
                      <td style={{ padding: "16px", color: "#64748b" }}>{patient.age ?? "—"}</td>
                      <td style={{ padding: "16px", color: "#64748b", textTransform: "capitalize" }}>
                        {patient.sex || "—"}
                      </td>
                      <td style={{ padding: "16px", color: "#64748b" }}>{patient.phone || "—"}</td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleViewHistory(patient.id)}
                            style={{
                              padding: "6px 12px",
                              background: "#f1f5f9",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              color: "#1e293b",
                            }}
                            title={t("patients.viewHistory", "View History")}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(patient)}
                            style={{
                              padding: "6px 12px",
                              background: "#fef2f2",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                            title={t("patients.edit", "Edit")}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(patient)}
                            style={{
                              padding: "6px 12px",
                              background: "#fef2f2",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                            title={t("patients.delete", "Delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {patientsData && patientsData.total > pageSize && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "24px",
                  padding: "16px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  {t("patients.showing", "Showing")} {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, patientsData.total)} {t("patients.of", "of")} {patientsData.total}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 16px",
                      background: currentPage === 1 ? "#f1f5f9" : "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      color: currentPage === 1 ? "#94a3b8" : "#1e293b",
                    }}
                  >
                    {t("patients.previous", "Previous")}
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage * pageSize >= (patientsData?.total || 0)}
                    style={{
                      padding: "8px 16px",
                      background: currentPage * pageSize >= (patientsData?.total || 0) ? "#f1f5f9" : "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: currentPage * pageSize >= (patientsData?.total || 0) ? "not-allowed" : "pointer",
                      color: currentPage * pageSize >= (patientsData?.total || 0) ? "#94a3b8" : "#1e293b",
                    }}
                  >
                    {t("patients.next", "Next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              setShowCreateModal(false);
              setEditingPatient(null);
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "32px",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
                  {editingPatient ? t("patients.editPatient", "Edit Patient") : t("patients.createPatient", "Create Patient")}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPatient(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Error Display */}
              {(createMutation.isError || updateMutation.isError) && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <p style={{ color: "#dc2626", fontSize: "14px", margin: 0 }}>
                    {(createMutation.error as Error)?.message || (updateMutation.error as Error)?.message || t("patients.error", "An error occurred")}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                    {t("patients.name", "Name")} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {t("patients.age", "Age")}
                    </label>
                    <input
                      type="number"
                      value={formData.age ?? ""}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : null })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {t("patients.sex", "Sex")}
                    </label>
                    <select
                      value={formData.sex || ""}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as any || null })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">{t("patients.select", "Select")}</option>
                      <option value="male">{t("patients.male", "Male")}</option>
                      <option value="female">{t("patients.female", "Female")}</option>
                      <option value="other">{t("patients.other", "Other")}</option>
                      <option value="unknown">{t("patients.unknown", "Unknown")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                    {t("patients.mrn", "Medical Record Number")}
                  </label>
                  <input
                    type="text"
                    value={formData.medicalRecordNumber}
                    onChange={(e) => setFormData({ ...formData, medicalRecordNumber: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {t("patients.phone", "Phone")}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {t("patients.email", "Email")}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                    {t("patients.address", "Address")}
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "32px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPatient(null);
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  {t("patients.cancel", "Cancel")}
                </button>
                <button
                  onClick={editingPatient ? handleUpdate : handleCreate}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{
                    padding: "12px 24px",
                    background: "#dc2626",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: createMutation.isPending || updateMutation.isPending ? "not-allowed" : "pointer",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <Save size={16} />
                  {editingPatient ? t("patients.save", "Save") : t("patients.create", "Create")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

