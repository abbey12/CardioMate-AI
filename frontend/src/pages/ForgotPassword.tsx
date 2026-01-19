import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../lib/api";
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t("forgotPassword.errors.requestFailed"));
    } finally {
      setLoading(false);
    }
  };

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
      {/* Animated ECG Waveform Background (same as login) */}
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
                alt={t("forgotPassword.logoAlt")}
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
              {t("forgotPassword.title")}
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                margin: 0,
                fontWeight: "400",
              }}
            >
              {t("forgotPassword.subtitle")}
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
                  {t("forgotPassword.success.title")}
                </div>
                <div style={{ color: "#15803d", fontSize: "14px", lineHeight: "1.6" }}>
                  {t("forgotPassword.success.body")}
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
                  {t("forgotPassword.fields.email")}
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
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("forgotPassword.placeholders.email")}
                    style={{
                      width: "100%",
                      padding: "16px 16px 16px 52px",
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
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: loading
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 12px rgba(220, 38, 38, 0.3), 0 2px 4px rgba(220, 38, 38, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(220, 38, 38, 0.4), 0 4px 8px rgba(220, 38, 38, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(220, 38, 38, 0.3), 0 2px 4px rgba(220, 38, 38, 0.2)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                    <span>{t("forgotPassword.actions.sending")}</span>
                  </>
                ) : (
                  t("forgotPassword.actions.sendLink")
                )}
              </button>
            </form>
          )}

          {/* Footer */}
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
              {t("forgotPassword.actions.backToLogin")}
            </Link>
          </div>
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

