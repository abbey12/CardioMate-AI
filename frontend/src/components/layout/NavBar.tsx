import { useAuth } from "../../lib/auth";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import { WalletBalance } from "../WalletBalance";
import { LogOut, Bell, Languages } from "lucide-react";

export function NavBar() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        zIndex: 1000,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain",
          }}
          onError={(e) => {
            // Fallback if logo doesn't load
            e.currentTarget.style.display = "none";
          }}
        />
        <div
          style={{
            height: "24px",
            width: "1px",
            background: "#e2e8f0",
          }}
        />
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
          {user?.facilityName || t("nav.facilityPortal")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {user?.role === "facility" && <WalletBalance />}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <Languages size={16} color="#64748b" />
          <select
            value={i18n.language.startsWith("fr") ? "fr" : "en"}
            onChange={(e) => setAppLanguage(e.target.value as "en" | "fr")}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "12px",
              color: "#1e293b",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="en">{t("language.english")}</option>
            <option value="fr">{t("language.french")}</option>
          </select>
        </div>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "8px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.color = "#1e293b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <Bell size={20} />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            borderRadius: "8px",
            background: "#f1f5f9",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#dc2626",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
              {user?.email || "User"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Facility</div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: "none",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: "8px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fef2f2";
            e.currentTarget.style.borderColor = "#fecaca";
            e.currentTarget.style.color = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <LogOut size={16} />
          {t("nav.logout")}
        </button>
      </div>
    </nav>
  );
}

