import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { adminLogin, adminSignup, type LoginData, type AdminSignupData } from "../../lib/api";
import { useTranslation } from "react-i18next";

export function AdminLogin() {
  const { t } = useTranslation();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        const data: AdminSignupData = { email, password, name: name || undefined };
        const response = await adminSignup(data);
        login(response);
        navigate("/admin/dashboard");
      } else {
        const data: LoginData = { email, password };
        const response = await adminLogin(data);
        login(response);
        navigate("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || t("adminLogin.errors.authFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "10px", color: "#0066cc" }}>{t("adminLogin.title")}</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          {isSignup ? t("adminLogin.subtitleSignup") : t("adminLogin.subtitleLogin")}
        </p>

        {error && (
          <div style={{ background: "#fee", color: "#c00", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>{t("adminLogin.fields.name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                placeholder={t("adminLogin.placeholders.name")}
              />
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>{t("adminLogin.fields.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              placeholder={t("adminLogin.placeholders.email")}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>{t("adminLogin.fields.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isSignup ? 8 : 6}
              style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              placeholder={isSignup ? t("adminLogin.placeholders.passwordSignup") : t("adminLogin.placeholders.password")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#ccc" : "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "15px",
            }}
          >
            {loading ? t("adminLogin.actions.loading") : isSignup ? t("adminLogin.actions.create") : t("adminLogin.actions.signIn")}
          </button>
        </form>

        <div style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
          {isSignup ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsSignup(false)}
                style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button
                onClick={() => setIsSignup(true)}
                style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}
              >
                Sign up
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #eee", textAlign: "center" }}>
          <Link to="/login" style={{ color: "#666", fontSize: "14px", textDecoration: "none" }}>
            {t("adminLogin.actions.backToSelection")}
          </Link>
        </div>
      </div>
    </div>
  );
}

