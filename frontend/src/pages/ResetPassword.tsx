import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../lib/api";
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("resetPassword.errors.invalidLink"));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("resetPassword.errors.invalidToken"));
      return;
    }

    if (password.length < 8) {
      setError(t("resetPassword.errors.passwordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("resetPassword.errors.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || t("resetPassword.errors.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1419 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "24px",
              padding: "48px 40px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              textAlign: "center",
            }}
          >
            <AlertCircle size={48} color="#dc2626" style={{ margin: "0 auto 20px" }} />
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>
              Invalid Reset Link
            </h1>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "#dc2626",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: "600",
              }}
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1419 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated ECG Waveform Background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.15,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(220, 38, 38, 0.1) 2px,
              rgba(220, 38, 38, 0.1) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(220, 38, 38, 0.1) 2px,
              rgba(220, 38, 38, 0.1) 4px
            )
          `,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "24px",
            padding: "48px 40px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            backdropFilter: "blur(20px)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Logo and Header */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              <img
                src="/logo.png"
                alt={t("resetPassword.logoAlt")}
                style={{
                  height: "80px",
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 12px rgba(220, 38, 38, 0.3))",
                }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                }}
              />
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#1e293b",
                margin: "0 0 8px 0",
                letterSpacing: "-0.5px",
              }}
            >
              {t("resetPassword.title")}
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                margin: 0,
                fontWeight: "400",
              }}
            >
              {t("resetPassword.subtitle")}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#166534", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>
                  {t("resetPassword.success.title")}
                </div>
                <div style={{ color: "#15803d", fontSize: "14px", lineHeight: "1.6" }}>
                  {t("resetPassword.success.body")}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <AlertCircle size={20} color="#dc2626" />
              <span style={{ color: "#991b1b", fontSize: "14px", fontWeight: "500" }}>
                {error}
              </span>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "8px",
                  }}
                >
                  {t("resetPassword.fields.newPassword")}
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      zIndex: 1,
                    }}
                  >
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder={t("resetPassword.placeholders.newPassword")}
                    style={{
                      width: "100%",
                      padding: "16px 52px 16px 52px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      fontSize: "15px",
                      background: "#ffffff",
                      color: "#1e293b",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#dc2626";
                      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(220, 38, 38, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", marginBottom: 0 }}>
                  {t("resetPassword.hints.passwordLength")}
                </p>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "8px",
                  }}
                >
                  {t("resetPassword.fields.confirmPassword")}
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      zIndex: 1,
                    }}
                  >
                    <Lock size={20} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder={t("resetPassword.placeholders.confirmPassword")}
                    style={{
                      width: "100%",
                      padding: "16px 52px 16px 52px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      fontSize: "15px",
                      background: "#ffffff",
                      color: "#1e293b",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#dc2626";
                      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(220, 38, 38, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#dc2626";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: loading || !password || !confirmPassword || password !== confirmPassword
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading || !password || !confirmPassword || password !== confirmPassword ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  boxShadow: loading || !password || !confirmPassword || password !== confirmPassword
                    ? "none"
                    : "0 4px 12px rgba(220, 38, 38, 0.3), 0 2px 4px rgba(220, 38, 38, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => {
                  if (!loading && password && confirmPassword && password === confirmPassword) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(220, 38, 38, 0.4), 0 4px 8px rgba(220, 38, 38, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && password && confirmPassword && password === confirmPassword) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(220, 38, 38, 0.3), 0 2px 4px rgba(220, 38, 38, 0.2)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                    <span>{t("resetPassword.actions.resetting")}</span>
                  </>
                ) : (
                  t("resetPassword.actions.reset")
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          {!success && (
            <div
              style={{
                marginTop: "32px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(220, 38, 38, 0.1)",
                textAlign: "center",
              }}
            >
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dc2626",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#dc2626";
                }}
              >
                <ArrowLeft size={16} />
                {t("resetPassword.actions.backToLogin")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

