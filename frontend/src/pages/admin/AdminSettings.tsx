import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  changePassword,
  getBonusSettings,
  updateBonusSettings,
  getRetentionSettings,
  updateRetentionSettings,
  anonymizeReports,
  purgeReports,
  getAdminLanguageSetting,
  updateAdminLanguageSetting,
} from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { useTranslation } from "react-i18next";
import { Settings, User, Lock, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Gift, Users, Shield, Trash2, Languages } from "lucide-react";
import { COLORS } from "../../ui/colors";

export function AdminSettings() {
  const { token, user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Check if we should open bonuses tab from dashboard link
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "bonuses" | "privacy" | "localization">(() => {
    const savedTab = sessionStorage.getItem("adminSettingsTab");
    if (savedTab === "bonuses") {
      sessionStorage.removeItem("adminSettingsTab");
      return "bonuses";
    }
    return "profile";
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await changePassword(token!, data.currentPassword, data.newPassword, handleTokenRefresh);
      return result;
    },
    onSuccess: () => {
      setSuccessMessage("Password changed successfully");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      const form = document.getElementById("password-form") as HTMLFormElement;
      form?.reset();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to change password");
      setSuccessMessage(null);
    },
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: bonusSettings, isLoading: bonusSettingsLoading } = useQuery({
    queryKey: ["bonusSettings"],
    queryFn: () => getBonusSettings(token!, handleTokenRefresh),
    enabled: !!token && isAdmin && activeTab === "bonuses",
  });

  const { data: retentionSettings, isLoading: retentionLoading } = useQuery({
    queryKey: ["retentionSettings"],
    queryFn: () => getRetentionSettings(token!),
    enabled: !!token && isAdmin && activeTab === "privacy",
  });

  const { data: languageSettings } = useQuery({
    queryKey: ["languageSettings"],
    queryFn: () => getAdminLanguageSetting(token!, handleTokenRefresh),
    enabled: !!token && isAdmin && activeTab === "localization",
  });

  const updateBonusMutation = useMutation({
    mutationFn: ({ type, amount, enabled }: { type: "signup" | "referral"; amount: number; enabled: boolean }) =>
      updateBonusSettings(token!, type, amount, enabled, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonusSettings"] });
      setSuccessMessage("Bonus settings updated successfully");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to update bonus settings");
      setSuccessMessage(null);
    },
  });

  const [bonusForm, setBonusForm] = useState({
    signupAmount: 50,
    signupEnabled: true,
    referralAmount: 25,
    referralEnabled: true,
  });

  const [retentionForm, setRetentionForm] = useState({
    retentionDays: 365,
    retentionEnabled: false,
    anonymizeAfterDays: 30,
    anonymizeEnabled: false,
  });

  const [languageForm, setLanguageForm] = useState<"en" | "fr">("en");

  // Update form when settings load
  useEffect(() => {
    if (bonusSettings) {
      setBonusForm({
        signupAmount: bonusSettings.signupBonus.amount,
        signupEnabled: bonusSettings.signupBonus.enabled,
        referralAmount: bonusSettings.referralBonus.amount,
        referralEnabled: bonusSettings.referralBonus.enabled,
      });
    }
  }, [bonusSettings]);

  useEffect(() => {
    if (retentionSettings) {
      setRetentionForm({
        retentionDays: retentionSettings.retention.days,
        retentionEnabled: retentionSettings.retention.enabled,
        anonymizeAfterDays: retentionSettings.anonymize.days,
        anonymizeEnabled: retentionSettings.anonymize.enabled,
      });
    }
  }, [retentionSettings]);

  useEffect(() => {
    if (languageSettings?.language) {
      setLanguageForm(languageSettings.language);
    }
  }, [languageSettings]);

  const updateRetentionMutation = useMutation({
    mutationFn: () =>
      updateRetentionSettings(token!, {
        retentionDays: retentionForm.retentionDays,
        retentionEnabled: retentionForm.retentionEnabled,
        anonymizeAfterDays: retentionForm.anonymizeAfterDays,
        anonymizeEnabled: retentionForm.anonymizeEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retentionSettings"] });
      setSuccessMessage("Retention settings updated successfully");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to update retention settings");
      setSuccessMessage(null);
    },
  });

  const anonymizeMutation = useMutation({
    mutationFn: () => anonymizeReports(token!, retentionForm.anonymizeAfterDays),
    onSuccess: (data) => {
      setSuccessMessage(`Anonymized ${data.anonymized} reports`);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to anonymize reports");
      setSuccessMessage(null);
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: () => updateAdminLanguageSetting(token!, languageForm, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languageSettings"] });
      setSuccessMessage("Language settings updated successfully");
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to update language settings");
      setSuccessMessage(null);
    },
  });

  const purgeMutation = useMutation({
    mutationFn: () => purgeReports(token!, retentionForm.retentionDays),
    onSuccess: (data) => {
      setSuccessMessage(`Purged ${data.purged} reports`);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to purge reports");
      setSuccessMessage(null);
    },
  });

  if (!isAdmin || !token) {
    return null;
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (passwordForm.newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
            {t("settings.title")}
          </h1>
          <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
            Manage your admin account settings
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "32px",
            borderBottom: `1px solid ${COLORS.GRAY_200}`,
          }}
        >
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "profile" ? `2px solid ${COLORS.RED}` : "2px solid transparent",
              color: activeTab === "profile" ? COLORS.RED : COLORS.GRAY_500,
              fontWeight: activeTab === "profile" ? "600" : "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={16} />
              {t("settings.profile")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("password")}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "password" ? `2px solid ${COLORS.RED}` : "2px solid transparent",
              color: activeTab === "password" ? COLORS.RED : COLORS.GRAY_500,
              fontWeight: activeTab === "password" ? "600" : "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={16} />
              {t("settings.password")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("bonuses")}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "bonuses" ? `2px solid ${COLORS.RED}` : "2px solid transparent",
              color: activeTab === "bonuses" ? COLORS.RED : COLORS.GRAY_500,
              fontWeight: activeTab === "bonuses" ? "600" : "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Gift size={16} />
              {t("adminSettings.bonuses")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "privacy" ? `2px solid ${COLORS.RED}` : "2px solid transparent",
              color: activeTab === "privacy" ? COLORS.RED : COLORS.GRAY_500,
              fontWeight: activeTab === "privacy" ? "600" : "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={16} />
              {t("adminSettings.privacyRetention")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("localization")}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "localization" ? `2px solid ${COLORS.RED}` : "2px solid transparent",
              color: activeTab === "localization" ? COLORS.RED : COLORS.GRAY_500,
              fontWeight: activeTab === "localization" ? "600" : "500",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Languages size={16} />
              {t("adminSettings.localization")}
            </div>
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <CheckCircle2 size={20} color="#16a34a" />
            <span style={{ color: "#166534", fontSize: "14px", fontWeight: "500" }}>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: COLORS.RED_LIGHT,
              border: `1px solid ${COLORS.RED_BORDER}`,
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <AlertCircle size={20} color={COLORS.RED} />
            <span style={{ color: COLORS.RED_DARK, fontSize: "14px", fontWeight: "500" }}>{errorMessage}</span>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              Profile Information
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={user?.name || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: COLORS.GRAY_50,
                    color: COLORS.GRAY_600,
                  }}
                />
                <p style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "6px" }}>
                  Name cannot be changed
                </p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: COLORS.GRAY_50,
                    color: COLORS.GRAY_600,
                  }}
                />
                <p style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "6px" }}>
                  Email cannot be changed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              Change Password
            </h2>
            <form id="password-form" onSubmit={handlePasswordSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px 48px 12px 16px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: COLORS.GRAY_400,
                        padding: "4px",
                      }}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                      style={{
                        width: "100%",
                        padding: "12px 48px 12px 16px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: COLORS.GRAY_400,
                        padding: "4px",
                      }}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "6px" }}>
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      minLength={8}
                      style={{
                        width: "100%",
                        padding: "12px 48px 12px 16px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: COLORS.GRAY_400,
                        padding: "4px",
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: changePasswordMutation.isPending ? COLORS.GRAY_300 : COLORS.RED,
                      color: COLORS.WHITE,
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: changePasswordMutation.isPending ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!changePasswordMutation.isPending) {
                        e.currentTarget.style.background = COLORS.RED_DARK;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!changePasswordMutation.isPending) {
                        e.currentTarget.style.background = COLORS.RED;
                      }
                    }}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Bonuses Tab */}
        {activeTab === "bonuses" && (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              Bonus Configuration
            </h2>
            <p style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "32px" }}>
              Configure automatic bonuses for new facility signups and referrals
            </p>

            {bonusSettingsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: COLORS.GRAY_400 }}>
                {t("adminSettings.bonusesLoading")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* Signup Bonus */}
                <div
                  style={{
                    padding: "24px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <Gift size={20} color={COLORS.RED} />
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
                      Signup Bonus
                    </h3>
                  </div>
                  <p style={{ fontSize: "14px", color: COLORS.GRAY_600, marginBottom: "20px" }}>
                    Amount automatically credited to new facilities when they sign up
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                        Bonus Amount (GHS)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bonusForm.signupAmount}
                        onChange={(e) => setBonusForm({ ...bonusForm, signupAmount: parseFloat(e.target.value) || 0 })}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: COLORS.WHITE,
                          color: COLORS.GRAY_800,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="checkbox"
                        id="signupEnabled"
                        checked={bonusForm.signupEnabled}
                        onChange={(e) => setBonusForm({ ...bonusForm, signupEnabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <label htmlFor="signupEnabled" style={{ fontSize: "14px", color: COLORS.GRAY_700, cursor: "pointer" }}>
                        Enable signup bonus
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        updateBonusMutation.mutate({
                          type: "signup",
                          amount: bonusForm.signupAmount,
                          enabled: bonusForm.signupEnabled,
                        });
                      }}
                      disabled={updateBonusMutation.isPending}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: updateBonusMutation.isPending ? COLORS.GRAY_300 : COLORS.RED,
                        color: COLORS.WHITE,
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: updateBonusMutation.isPending ? "not-allowed" : "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      {updateBonusMutation.isPending ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Signup Bonus
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Referral Bonus */}
                <div
                  style={{
                    padding: "24px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <Users size={20} color={COLORS.BLUE} />
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
                      Referral Bonus
                    </h3>
                  </div>
                  <p style={{ fontSize: "14px", color: COLORS.GRAY_600, marginBottom: "20px" }}>
                    Amount credited to facilities when they refer a new facility that signs up
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                        Bonus Amount (GHS)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bonusForm.referralAmount}
                        onChange={(e) => setBonusForm({ ...bonusForm, referralAmount: parseFloat(e.target.value) || 0 })}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: COLORS.WHITE,
                          color: COLORS.GRAY_800,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="checkbox"
                        id="referralEnabled"
                        checked={bonusForm.referralEnabled}
                        onChange={(e) => setBonusForm({ ...bonusForm, referralEnabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <label htmlFor="referralEnabled" style={{ fontSize: "14px", color: COLORS.GRAY_700, cursor: "pointer" }}>
                        Enable referral bonus
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        updateBonusMutation.mutate({
                          type: "referral",
                          amount: bonusForm.referralAmount,
                          enabled: bonusForm.referralEnabled,
                        });
                      }}
                      disabled={updateBonusMutation.isPending}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: updateBonusMutation.isPending ? COLORS.GRAY_300 : COLORS.BLUE,
                        color: COLORS.WHITE,
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: updateBonusMutation.isPending ? "not-allowed" : "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      {updateBonusMutation.isPending ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Referral Bonus
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy & Retention Tab */}
        {activeTab === "privacy" && (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              Privacy & Data Retention
            </h2>
            <p style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "32px" }}>
              Control how long data is retained and when reports are anonymized.
            </p>

            {retentionLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: COLORS.GRAY_400 }}>
                {t("adminSettings.retentionLoading")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                <div style={{ padding: "24px", background: COLORS.GRAY_50, borderRadius: "12px", border: `1px solid ${COLORS.GRAY_200}` }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "12px" }}>
                    Data Retention
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                        Retention Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={retentionForm.retentionDays}
                        onChange={(e) => setRetentionForm({ ...retentionForm, retentionDays: parseInt(e.target.value) || 1 })}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: COLORS.WHITE,
                          color: COLORS.GRAY_800,
                        }}
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: COLORS.GRAY_700 }}>
                      <input
                        type="checkbox"
                        checked={retentionForm.retentionEnabled}
                        onChange={(e) => setRetentionForm({ ...retentionForm, retentionEnabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      Enable automatic purging
                    </label>
                  </div>
                </div>

                <div style={{ padding: "24px", background: COLORS.GRAY_50, borderRadius: "12px", border: `1px solid ${COLORS.GRAY_200}` }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "12px" }}>
                    Anonymization
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                        Anonymize After (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={retentionForm.anonymizeAfterDays}
                        onChange={(e) => setRetentionForm({ ...retentionForm, anonymizeAfterDays: parseInt(e.target.value) || 1 })}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: COLORS.WHITE,
                          color: COLORS.GRAY_800,
                        }}
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: COLORS.GRAY_700 }}>
                      <input
                        type="checkbox"
                        checked={retentionForm.anonymizeEnabled}
                        onChange={(e) => setRetentionForm({ ...retentionForm, anonymizeEnabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      Enable automatic anonymization
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => updateRetentionMutation.mutate()}
                    disabled={updateRetentionMutation.isPending}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: updateRetentionMutation.isPending ? COLORS.GRAY_300 : COLORS.RED,
                      color: COLORS.WHITE,
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: updateRetentionMutation.isPending ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <Shield size={16} />
                    Save Settings
                  </button>
                  <button
                    onClick={() => anonymizeMutation.mutate()}
                    disabled={anonymizeMutation.isPending}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: COLORS.BLUE_LIGHT,
                      color: COLORS.BLUE,
                      border: `1px solid ${COLORS.BLUE_BORDER}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: anonymizeMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    <Users size={16} />
                    Anonymize Now
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Permanently delete reports older than retention days? This cannot be undone.")) {
                        purgeMutation.mutate();
                      }
                    }}
                    disabled={purgeMutation.isPending}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: COLORS.RED_LIGHT,
                      color: COLORS.RED,
                      border: `1px solid ${COLORS.RED_BORDER}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: purgeMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    <Trash2 size={16} />
                    Purge Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Localization Tab */}
        {activeTab === "localization" && (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "12px" }}>
              {t("adminSettings.localization")}
            </h2>
            <p style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "24px" }}>
              {t("adminSettings.defaultLanguage")}
            </p>
            <div style={{ maxWidth: "360px", display: "grid", gap: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700 }}>
                {t("adminSettings.defaultLanguage")}
              </label>
              <select
                value={languageForm}
                onChange={(e) => setLanguageForm(e.target.value as "en" | "fr")}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: COLORS.WHITE,
                  color: COLORS.GRAY_800,
                }}
              >
                <option value="en">{t("language.english")}</option>
                <option value="fr">{t("language.french")}</option>
              </select>
              <button
                onClick={() => updateLanguageMutation.mutate()}
                disabled={updateLanguageMutation.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: updateLanguageMutation.isPending ? COLORS.GRAY_300 : COLORS.RED,
                  color: COLORS.WHITE,
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: updateLanguageMutation.isPending ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Save size={16} />
                {t("adminSettings.save")}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  );
}

