import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { facilityLogin, type LoginData } from "../../lib/api";
import { useTranslation } from "react-i18next";

export function FacilityLogin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: LoginData = { email, password };
      const response = await facilityLogin(data);
      login(response);
      navigate("/facility/dashboard");
    } catch (err: any) {
      setError(err?.message || t("facilityLogin.errors.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "10px", color: "#28a745" }}>{t("facilityLogin.title")}</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>{t("facilityLogin.subtitle")}</p>

        {error && (
          <div style={{ background: "#fee", color: "#c00", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>{t("facilityLogin.fields.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              placeholder={t("facilityLogin.placeholders.email")}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>{t("facilityLogin.fields.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
              placeholder={t("facilityLogin.placeholders.password")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "15px",
            }}
          >
            {loading ? t("facilityLogin.actions.loading") : t("facilityLogin.actions.signIn")}
          </button>
        </form>

        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #eee", textAlign: "center" }}>
          <Link to="/login" style={{ color: "#666", fontSize: "14px", textDecoration: "none" }}>
            {t("facilityLogin.actions.backToSelection")}
          </Link>
        </div>
      </div>
    </div>
  );
}

