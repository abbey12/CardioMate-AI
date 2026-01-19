import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFacilityProfile,
  updateFacilityProfile,
  changeFacilityPassword,
  type FacilityProfile,
} from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import { AFRICAN_COUNTRIES } from "../../ui/africanCountries";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import {
  Settings,
  User,
  Mail,
  Key,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Shield,
  FileCheck,
  Activity,
  Phone,
  Languages,
} from "lucide-react";

export function FacilitySettings() {
  const { token, isFacility, logout } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "preferences">("profile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ["facilityProfile"],
    queryFn: () => getFacilityProfile(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        return false;
      }
      return failureCount < 2;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateFacilityProfile>[1]) =>
      updateFacilityProfile(token!, data, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityProfile"] });
      setSuccessMessage(t("facilitySettings.messages.profileUpdated"));
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || t("facilitySettings.messages.profileUpdateFailed"));
      setSuccessMessage(null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await changeFacilityPassword(token!, data.currentPassword, data.newPassword, handleTokenRefresh);
      return result;
    },
    onSuccess: () => {
      setSuccessMessage(t("facilitySettings.messages.passwordChanged"));
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      // Reset form
      const form = document.getElementById("password-form") as HTMLFormElement;
      form?.reset();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || t("facilitySettings.messages.passwordChangeFailed"));
      setSuccessMessage(null);
    },
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    facilityType: "",
    contactName: "",
    contactPhone: "",
    website: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const defaultPreferences = {
    timezone: "Africa/Accra",
    defaultDateRange: "30",
    reportView: "summary",
    notifyOnComplete: true,
    notifyLowBalance: true,
    whatsappDefaultPhone: "",
    language: i18n.language.startsWith("fr") ? "fr" : "en",
  };

  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem("facilityPreferences");
      if (!stored) return defaultPreferences;
      const parsed = JSON.parse(stored);
      return { ...defaultPreferences, ...parsed };
    } catch {
      return defaultPreferences;
    }
  });

  // Update language preference from profile when it loads
  if (profile && profile.preferredLanguage && preferences.language !== profile.preferredLanguage) {
    setPreferences({ ...preferences, language: profile.preferredLanguage });
  }

  const [profileInitialized, setProfileInitialized] = useState(false);

  // Update form when profile loads
  if (profile && !profileInitialized) {
    setProfileForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      addressLine1: profile.addressLine1 || "",
      addressLine2: profile.addressLine2 || "",
      city: profile.city || "",
      country: profile.country || "",
      facilityType: profile.facilityType || "",
      contactName: profile.contactName || "",
      contactPhone: profile.contactPhone || "",
      website: profile.website || "",
    });
    setProfileInitialized(true);
  }

  if (!isFacility || !token) {
    return null;
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim() || null,
      addressLine1: profileForm.addressLine1.trim() || null,
      addressLine2: profileForm.addressLine2.trim() || null,
      city: profileForm.city.trim() || null,
      country: profileForm.country.trim() || null,
      facilityType: profileForm.facilityType.trim() || null,
      contactName: profileForm.contactName.trim() || null,
      contactPhone: profileForm.contactPhone.trim() || null,
      website: profileForm.website.trim() || null,
    };
    updateProfileMutation.mutate(payload);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage(t("facilitySettings.messages.passwordMismatch"));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setErrorMessage(t("facilitySettings.messages.passwordLength"));
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handlePreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save language preference to backend
      if (preferences.language === "en" || preferences.language === "fr") {
        await updateFacilityProfile(token!, { preferredLanguage: preferences.language }, handleTokenRefresh);
        setAppLanguage(preferences.language);
        queryClient.invalidateQueries({ queryKey: ["facilityProfile"] });
      }
      
      // Save other preferences to localStorage
      const { language, ...otherPreferences } = preferences;
      localStorage.setItem("facilityPreferences", JSON.stringify(otherPreferences));
      
      setSuccessMessage(t("facilitySettings.messages.preferencesSaved"));
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || t("facilitySettings.messages.preferencesSaveFailed"));
      setSuccessMessage(null);
    }
  };

  const completionFields = [
    { key: "phone", label: t("facilitySettings.missingFields.phone") },
    { key: "addressLine1", label: t("facilitySettings.missingFields.addressLine1") },
    { key: "city", label: t("facilitySettings.missingFields.city") },
    { key: "country", label: t("facilitySettings.missingFields.country") },
    { key: "facilityType", label: t("facilitySettings.missingFields.facilityType") },
    { key: "contactName", label: t("facilitySettings.missingFields.contactName") },
    { key: "contactPhone", label: t("facilitySettings.missingFields.contactPhone") },
  ] as const;

  const missingFields = completionFields.filter((field) => {
    const value = (profileForm as Record<string, string>)[field.key];
    return !value || value.trim().length === 0;
  });
  const completionPercent = Math.round(
    ((completionFields.length - missingFields.length) / completionFields.length) * 100
  );
  const isSignupComplete = missingFields.length === 0;

  return (
    <Layout>
      <div>
        {/* Page Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
            {t("settings.title")}
          </h1>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
            {t("facilitySettings.subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              padding: "12px 24px",
              background: activeTab === "profile" ? "#eff6ff" : "transparent",
              color: activeTab === "profile" ? "#2563eb" : "#64748b",
              border: "none",
              borderBottom: activeTab === "profile" ? "2px solid #2563eb" : "2px solid transparent",
              fontSize: "14px",
              fontWeight: activeTab === "profile" ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <User size={18} />
            {t("settings.profile")}
          </button>
          <button
            onClick={() => setActiveTab("password")}
            style={{
              padding: "12px 24px",
              background: activeTab === "password" ? "#eff6ff" : "transparent",
              color: activeTab === "password" ? "#2563eb" : "#64748b",
              border: "none",
              borderBottom: activeTab === "password" ? "2px solid #2563eb" : "2px solid transparent",
              fontSize: "14px",
              fontWeight: activeTab === "password" ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Key size={18} />
            {t("settings.password")}
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            style={{
              padding: "12px 24px",
              background: activeTab === "preferences" ? "#eff6ff" : "transparent",
              color: activeTab === "preferences" ? "#2563eb" : "#64748b",
              border: "none",
              borderBottom: activeTab === "preferences" ? "2px solid #2563eb" : "2px solid transparent",
              fontSize: "14px",
              fontWeight: activeTab === "preferences" ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Settings size={18} />
            {t("settings.preferences")}
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#166534",
              marginBottom: "24px",
            }}
          >
            <CheckCircle2 size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#dc2626",
              marginBottom: "24px",
            }}
          >
            <AlertCircle size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>{errorMessage}</span>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0" }}>
                    Account Information
                  </h2>
                  <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                    Update your facility name and email address
                  </p>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: isSignupComplete ? "#f0fdf4" : "#fef3c7",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    {isSignupComplete ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#d97706" />}
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {isSignupComplete ? t("settings.signupCompleted") : t("settings.completeSignup")}
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>
                    {isSignupComplete
                      ? `Completed on ${profile?.signupCompletedAt ? new Date(profile.signupCompletedAt).toLocaleDateString() : "this session"}`
                      : t("facilitySettings.completeSignup.subtitle")}
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      background: "#e2e8f0",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: `${completionPercent}%`,
                        height: "100%",
                        background: isSignupComplete ? "#16a34a" : "#f59e0b",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: missingFields.length ? "8px" : 0 }}>
                    {completionPercent}% complete
                  </div>
                  {missingFields.length > 0 && (
                    <div style={{ fontSize: "12px", color: "#92400e" }}>
                      Missing: {missingFields.map((field) => field.label).join(", ")}
                    </div>
                  )}
                </div>

                <form onSubmit={handleProfileSubmit}>
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
                          Facility Name
                        </div>
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
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
                          e.currentTarget.style.borderColor = "#2563eb";
                          e.currentTarget.style.outline = "none";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
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
                          <Mail size={16} />
                          Email Address
                        </div>
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
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
                          e.currentTarget.style.borderColor = "#2563eb";
                          e.currentTarget.style.outline = "none";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
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
                          Facility Phone
                        </div>
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder={t("facilitySettings.profile.placeholders.phone")}
                        style={{
                          width: "100%",
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
                    </div>

                    <div style={{ marginTop: "8px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 12px 0" }}>
                        Facility Details
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                            Address Line 1
                          </label>
                          <input
                            type="text"
                            value={profileForm.addressLine1}
                            onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
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
                            Address Line 2 (optional)
                          </label>
                          <input
                            type="text"
                            value={profileForm.addressLine2}
                            onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                            {t("facilitySettings.profile.city")}
                            </label>
                            <input
                              type="text"
                              value={profileForm.city}
                              onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
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
                            {t("facilitySettings.profile.country")}
                            </label>
                            <select
                              value={profileForm.country}
                              onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                background: "#ffffff",
                              }}
                            >
                              <option value="">{t("facilitySettings.profile.selectCountry")}</option>
                              {AFRICAN_COUNTRIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
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
                            {t("facilitySettings.profile.facilityType")}
                          </label>
                          <select
                            value={profileForm.facilityType}
                            onChange={(e) => setProfileForm({ ...profileForm, facilityType: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              background: "#ffffff",
                            }}
                          >
                            <option value="">{t("facilitySettings.profile.selectType")}</option>
                            <option value="Hospital">{t("facilitySettings.facilityType.hospital")}</option>
                            <option value="Clinic">{t("facilitySettings.facilityType.clinic")}</option>
                            <option value="Diagnostic Center">{t("facilitySettings.facilityType.diagnosticCenter")}</option>
                            <option value="Telemedicine">{t("facilitySettings.facilityType.telemedicine")}</option>
                            <option value="Research">{t("facilitySettings.facilityType.research")}</option>
                            <option value="Other">{t("facilitySettings.facilityType.other")}</option>
                          </select>
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
                            {t("facilitySettings.profile.websiteOptional")}
                          </label>
                          <input
                            type="url"
                            value={profileForm.website}
                            onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                            placeholder={t("facilitySettings.profile.placeholders.website")}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "8px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 12px 0" }}>
                        {t("facilitySettings.profile.primaryContact")}
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                            {t("facilitySettings.profile.contactName")}
                          </label>
                          <input
                            type="text"
                            value={profileForm.contactName}
                            onChange={(e) => setProfileForm({ ...profileForm, contactName: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
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
                            {t("facilitySettings.profile.contactPhone")}
                          </label>
                          <input
                            type="tel"
                            value={profileForm.contactPhone}
                            onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {profile && (
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                          <Shield size={16} color="#64748b" />
                          <span style={{ fontWeight: "500", color: "#64748b" }}>{t("facilitySettings.profile.accountDetails")}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                              Facility ID
                            </div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                              {profile.id}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                              Created
                            </div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                              {new Date(profile.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      style={{
                        width: "100%",
                        padding: "12px 20px",
                        background: updateProfileMutation.isPending ? "#94a3b8" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: updateProfileMutation.isPending ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        if (!updateProfileMutation.isPending) {
                          e.currentTarget.style.background = "#1d4ed8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updateProfileMutation.isPending) {
                          e.currentTarget.style.background = "#2563eb";
                        }
                      }}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                          {t("facilitySettings.actions.saving")}
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {t("facilitySettings.actions.saveChanges")}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0" }}>
                {t("facilitySettings.preferences.title")}
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                {t("facilitySettings.preferences.subtitle")}
              </p>
            </div>

            <form onSubmit={handlePreferencesSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                        <Calendar size={16} />
                        {t("facilitySettings.preferences.defaultDateRange")}
                      </div>
                    </label>
                    <select
                      value={preferences.defaultDateRange}
                      onChange={(e) => setPreferences({ ...preferences, defaultDateRange: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="7">{t("facilitySettings.preferences.last7Days")}</option>
                      <option value="30">{t("facilitySettings.preferences.last30Days")}</option>
                      <option value="90">{t("facilitySettings.preferences.last90Days")}</option>
                    </select>
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
                        <FileCheck size={16} />
                        {t("facilitySettings.preferences.defaultReportView")}
                      </div>
                    </label>
                    <select
                      value={preferences.reportView}
                      onChange={(e) => setPreferences({ ...preferences, reportView: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="summary">{t("facilitySettings.preferences.summary")}</option>
                      <option value="full">{t("facilitySettings.preferences.fullReport")}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                        <Languages size={16} />
                        {t("language.label")}
                      </div>
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="en">{t("language.english")}</option>
                      <option value="fr">{t("language.french")}</option>
                    </select>
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
                        <Calendar size={16} />
                        Timezone
                      </div>
                    </label>
                    <input
                      type="text"
                      value={preferences.timezone}
                      onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                      placeholder={t("facilitySettings.preferences.placeholders.timezone")}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                  </div>
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
                      <Mail size={16} />
                      WhatsApp Default Phone
                    </div>
                  </label>
                  <input
                    type="tel"
                    value={preferences.whatsappDefaultPhone}
                    onChange={(e) => setPreferences({ ...preferences, whatsappDefaultPhone: e.target.value })}
                    placeholder={t("facilitySettings.profile.placeholders.contactPhone")}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#1e293b" }}>
                      <Activity size={16} />
                      Notify when analysis completes
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnComplete}
                      onChange={(e) => setPreferences({ ...preferences, notifyOnComplete: e.target.checked })}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#1e293b" }}>
                      <AlertCircle size={16} />
                      Low balance alerts
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyLowBalance}
                      onChange={(e) => setPreferences({ ...preferences, notifyLowBalance: e.target.checked })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 20px",
                      background: "#2563eb",
                      color: "#ffffff",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: "600",
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
                    <Save size={16} />
                    Save Preferences
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0" }}>
                Change Password
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                Update your password to keep your account secure
              </p>
            </div>

            <form id="password-form" onSubmit={handlePasswordSubmit}>
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
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
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
                      e.currentTarget.style.borderColor = "#2563eb";
                      e.currentTarget.style.outline = "none";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
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
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    required
                    minLength={8}
                    style={{
                      width: "100%",
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
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                    Must be at least 8 characters long
                  </div>
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
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    required
                    minLength={8}
                    style={{
                      width: "100%",
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
                </div>

                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    background: changePasswordMutation.isPending ? "#94a3b8" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: changePasswordMutation.isPending ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!changePasswordMutation.isPending) {
                      e.currentTarget.style.background = "#1d4ed8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!changePasswordMutation.isPending) {
                      e.currentTarget.style.background = "#2563eb";
                    }
                  }}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Key size={18} />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}

