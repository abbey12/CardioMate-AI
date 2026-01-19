import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { unifiedLogin, facilitySelfSignup, getDefaultLanguage, type LoginData, type FacilitySignupData } from "../lib/api";
import { AFRICAN_COUNTRIES, AFRICAN_COUNTRY_BY_CODE } from "../ui/africanCountries";
import { useTranslation } from "react-i18next";
import { getStoredLanguage, setAppLanguage } from "../i18n";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, UserPlus, User, Globe } from "lucide-react";

export function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const francophoneCountryCodes = new Set([
    "DZ",
    "BJ",
    "BF",
    "BI",
    "CM",
    "CF",
    "TD",
    "KM",
    "CG",
    "CD",
    "CI",
    "DJ",
    "GQ",
    "GA",
    "GN",
    "MG",
    "ML",
    "MR",
    "MU",
    "MA",
    "NE",
    "RW",
    "SN",
    "SC",
    "TG",
    "TN",
  ]);

  const isFrancophoneCountry = (countryName: string) => {
    const code = Object.entries(AFRICAN_COUNTRY_BY_CODE).find(([, name]) => name === countryName)?.[0];
    return code ? francophoneCountryCodes.has(code) : false;
  };

  useEffect(() => {
    if (mode !== "signup" || country) return;

    const detectCountryFromLocale = () => {
      const locale = navigator.language || "";
      const parts = locale.split("-");
      if (parts.length > 1) {
        const region = parts[1].toUpperCase();
        return AFRICAN_COUNTRY_BY_CODE[region];
      }
      return undefined;
    };

    const detectLanguageFromLocale = () => {
      const locale = navigator.language || "";
      return locale.toLowerCase().startsWith("fr") ? "fr" : "en";
    };

    const detectCountryFromGeoIP = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return undefined;
        const json = await res.json();
        const code = String(json?.country_code || "").toUpperCase();
        if (francophoneCountryCodes.has(code)) {
          setAppLanguage("fr");
        }
        return AFRICAN_COUNTRY_BY_CODE[code];
      } catch {
        return undefined;
      }
    };

    const applyDetection = async () => {
      const localeCountry = detectCountryFromLocale();
      const preferred = getStoredLanguage();
      if (!preferred) {
        const detectedLang = detectLanguageFromLocale();
        setAppLanguage(detectedLang);
        if (localeCountry && isFrancophoneCountry(localeCountry)) {
          setAppLanguage("fr");
        }
      }
      if (localeCountry) {
        setCountry(localeCountry);
        return;
      }
      const geoCountry = await detectCountryFromGeoIP();
      if (geoCountry) {
        setCountry(geoCountry);
      }
    };

    applyDetection();
  }, [mode, country]);

  useEffect(() => {
    const preferred = getStoredLanguage();
    if (preferred) return;
    getDefaultLanguage()
      .then((res) => {
        if (res?.language === "en" || res?.language === "fr") {
          setAppLanguage(res.language);
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to get default language:", err);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const data: LoginData = { email, password };
        const response = await unifiedLogin(data);
        login(response);
        
        // Navigate based on user role
        if (response.admin) {
          navigate("/admin/dashboard");
        } else if (response.facility) {
          navigate("/facility/dashboard");
        }
      } else {
        if (password.length < 8) {
          setError(t("login.errors.passwordLength"));
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t("login.errors.passwordMismatch"));
          setLoading(false);
          return;
        }
        if (!country) {
          setError(t("login.errors.selectCountry"));
          setLoading(false);
          return;
        }
        const data: FacilitySignupData = {
          name: facilityName.trim(),
          email: email.trim(),
          password,
          referralCode: referralCode.trim() ? referralCode.trim() : null,
          country,
        };
        const response = await facilitySelfSignup(data);
        login(response);
        navigate("/facility/settings");
      }
    } catch (err: any) {
      setError(err?.message || (mode === "login" ? t("login.errors.loginFailed") : t("login.errors.signupFailed")));
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
      
      {/* Multiple ECG Waveform Layers */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.25,
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="ecgPattern" x="0" y="0" width="400" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 0 100
                 L 20 100
                 L 25 80
                 L 30 60
                 L 35 40
                 L 40 20
                 L 45 40
                 L 50 60
                 L 55 80
                 L 60 100
                 L 65 100
                 L 70 100
                 L 75 100
                 L 80 100
                 L 85 100
                 L 90 100
                 L 95 100
                 L 100 100
                 L 120 100
                 L 125 80
                 L 130 60
                 L 135 40
                 L 140 20
                 L 145 40
                 L 150 60
                 L 155 80
                 L 160 100
                 L 165 100
                 L 170 100
                 L 175 100
                 L 180 100
                 L 185 100
                 L 190 100
                 L 195 100
                 L 200 100
                 L 220 100
                 L 225 80
                 L 230 60
                 L 235 40
                 L 240 20
                 L 245 40
                 L 250 60
                 L 255 80
                 L 260 100
                 L 265 100
                 L 270 100
                 L 275 100
                 L 280 100
                 L 285 100
                 L 290 100
                 L 295 100
                 L 300 100
                 L 320 100
                 L 325 80
                 L 330 60
                 L 335 40
                 L 340 20
                 L 345 40
                 L 350 60
                 L 355 80
                 L 360 100
                 L 365 100
                 L 370 100
                 L 375 100
                 L 380 100
                 L 385 100
                 L 390 100
                 L 395 100
                 L 400 100"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ecgPattern)" style={{ animation: "ecgScroll 8s linear infinite" }} />
      </svg>

      {/* Second ECG Layer (offset for depth) */}
      <svg
        style={{
          position: "absolute",
          top: "30%",
          left: 0,
          width: "100%",
          height: "40%",
          opacity: 0.2,
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="ecgPattern2" x="0" y="0" width="400" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 0 100
                 L 25 100
                 L 30 90
                 L 35 70
                 L 40 50
                 L 45 30
                 L 50 50
                 L 55 70
                 L 60 90
                 L 65 100
                 L 90 100
                 L 95 90
                 L 100 70
                 L 105 50
                 L 110 30
                 L 115 50
                 L 120 70
                 L 125 90
                 L 130 100
                 L 155 100
                 L 160 90
                 L 165 70
                 L 170 50
                 L 175 30
                 L 180 50
                 L 185 70
                 L 190 90
                 L 195 100
                 L 220 100
                 L 225 90
                 L 230 70
                 L 235 50
                 L 240 30
                 L 245 50
                 L 250 70
                 L 255 90
                 L 260 100
                 L 285 100
                 L 290 90
                 L 295 70
                 L 300 50
                 L 305 30
                 L 310 50
                 L 315 70
                 L 320 90
                 L 325 100
                 L 350 100
                 L 355 90
                 L 360 70
                 L 365 50
                 L 370 30
                 L 375 50
                 L 380 70
                 L 385 90
                 L 390 100
                 L 400 100"
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ecgPattern2)" style={{ animation: "ecgScroll 12s linear infinite reverse" }} />
      </svg>

      {/* Third ECG Layer (subtle) */}
      <svg
        style={{
          position: "absolute",
          top: "60%",
          left: 0,
          width: "100%",
          height: "30%",
          opacity: 0.15,
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="ecgPattern3" x="0" y="0" width="500" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 0 100
                 L 30 100
                 L 35 85
                 L 40 65
                 L 45 45
                 L 50 25
                 L 55 45
                 L 60 65
                 L 65 85
                 L 70 100
                 L 100 100
                 L 105 85
                 L 110 65
                 L 115 45
                 L 120 25
                 L 125 45
                 L 130 65
                 L 135 85
                 L 140 100
                 L 170 100
                 L 175 85
                 L 180 65
                 L 185 45
                 L 190 25
                 L 195 45
                 L 200 65
                 L 205 85
                 L 210 100
                 L 240 100
                 L 245 85
                 L 250 65
                 L 255 45
                 L 260 25
                 L 265 45
                 L 270 65
                 L 275 85
                 L 280 100
                 L 310 100
                 L 315 85
                 L 320 65
                 L 325 45
                 L 330 25
                 L 335 45
                 L 340 65
                 L 345 85
                 L 350 100
                 L 380 100
                 L 385 85
                 L 390 65
                 L 395 45
                 L 400 25
                 L 405 45
                 L 410 65
                 L 415 85
                 L 420 100
                 L 450 100
                 L 455 85
                 L 460 65
                 L 465 45
                 L 470 25
                 L 475 45
                 L 480 65
                 L 485 85
                 L 490 100
                 L 500 100"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ecgPattern3)" style={{ animation: "ecgScroll 10s linear infinite" }} />
      </svg>

      <style>{`
        @keyframes ecgScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(400px);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.25;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "24px",
          position: "relative",
          zIndex: 1,
          animation: "slideIn 0.6s ease-out",
        }}
      >
        {/* Login Card */}
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
                alt={t("login.logoAlt")}
                style={{
                  height: "80px",
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 12px rgba(220, 38, 38, 0.3))",
                }}
                onError={(e) => {
                  // Fallback if logo doesn't load
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.style.cssText = `
                    width: 80px;
                    height: 80px;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(220, 38, 38, 0.3);
                  `;
                  fallback.textContent = "CM";
                  fallback.style.color = "#ffffff";
                  fallback.style.fontSize = "32px";
                  fallback.style.fontWeight = "700";
                  target.parentElement?.appendChild(fallback);
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
              {mode === "login" ? t("login.welcomeBack") : t("login.createAccount")}
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                margin: 0,
                fontWeight: "400",
              }}
            >
              {mode === "login" ? t("login.signInSubtitle") : t("login.signUpSubtitle")}
            </p>
          </div>

          {/* Language Selector */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#64748b",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "999px",
                padding: "6px 12px",
              }}
            >
              <Globe size={16} />
              <span>{t("language.label")}</span>
              <select
                value={i18n.language.startsWith("fr") ? "fr" : "en"}
                onChange={(e) => setAppLanguage(e.target.value as "en" | "fr")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="en">{t("language.english")}</option>
                <option value="fr">{t("language.french")}</option>
              </select>
            </label>
          </div>

          {/* Mode Switch */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "6px",
              background: "#f1f5f9",
              borderRadius: "999px",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "999px",
                border: "none",
                background: mode === "login" ? "#ffffff" : "transparent",
                color: mode === "login" ? "#1e293b" : "#64748b",
                fontWeight: mode === "login" ? "600" : "500",
                cursor: "pointer",
                boxShadow: mode === "login" ? "0 2px 8px rgba(15, 23, 42, 0.1)" : "none",
              }}
            >
              {t("login.signIn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "999px",
                border: "none",
                background: mode === "signup" ? "#ffffff" : "transparent",
                color: mode === "signup" ? "#1e293b" : "#64748b",
                fontWeight: mode === "signup" ? "600" : "500",
                cursor: "pointer",
                boxShadow: mode === "signup" ? "0 2px 8px rgba(15, 23, 42, 0.1)" : "none",
              }}
            >
              {t("login.create")}
            </button>
          </div>

          {/* Error Message */}
          {error && (
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
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <AlertCircle size={20} color="#dc2626" />
              <span style={{ color: "#991b1b", fontSize: "14px", fontWeight: "500" }}>
                {error}
              </span>
            </div>
          )}

          {/* Login/Signup Form */}
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                {/* Facility Name */}
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
                    {t("login.facilityName")}
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
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      required
                      placeholder={t("login.placeholderFacility")}
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
              </>
            )}
            {/* Email Field */}
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
                {t("login.email")}
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
                  placeholder={t("login.placeholderEmail")}
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

            {/* Password Field */}
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
                {t("login.password")}
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
                  placeholder={t("login.placeholderPassword")}
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
            </div>

            {mode === "signup" && (
              <>
                {/* Confirm Password */}
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
                    {t("login.confirmPassword")}
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder={t("login.placeholderConfirm")}
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

                {/* Country */}
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
                    {t("login.country")}
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
                      <Globe size={20} />
                    </div>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
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
                        appearance: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#dc2626";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(220, 38, 38, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="">{t("login.selectCountry")}</option>
                      {AFRICAN_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Referral Code */}
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
                    {t("login.referral")}
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
                      <UserPlus size={20} />
                    </div>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder={t("login.placeholderReferral")}
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
              </>
            )}

            {/* Submit Button */}
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
                position: "relative",
                overflow: "hidden",
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
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                  <span>{mode === "login" ? t("login.signingIn") : t("login.creating")}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? t("login.signIn") : t("login.create")}</span>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid #ffffff",
                      borderTop: "none",
                      borderRight: "none",
                      borderBottomLeftRadius: "2px",
                      transform: "rotate(-45deg)",
                    }}
                  />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid rgba(220, 38, 38, 0.1)",
              textAlign: "center",
            }}
          >
            {mode === "login" ? (
              <Link
                to="/forgot-password"
                style={{
                  display: "inline-block",
                  color: "#dc2626",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "16px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#b91c1c";
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#dc2626";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("login.forgotPassword")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  marginBottom: "16px",
                }}
              >
                {t("login.alreadyHave")}
              </button>
            )}
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "16px 0 0 0",
                lineHeight: "1.6",
              }}
            >
              Secure login powered by{" "}
              <span style={{ color: "#dc2626", fontWeight: "600" }}>{t("app.name")}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

