import { useAuth } from "../../lib/auth";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../i18n";
import { LogOut, Bell, Languages } from "lucide-react";
import { COLORS } from "../../ui/colors";

export function AdminNavBar() {
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
        background: COLORS.WHITE,
        borderBottom: `1px solid ${COLORS.GRAY_200}`,
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
          alt="CardioMate AI Logo"
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div
          style={{
            height: "24px",
            width: "1px",
            background: COLORS.GRAY_200,
          }}
        />
        <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
          {t("nav.adminPortal")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: `1px solid ${COLORS.GRAY_200}`,
            background: COLORS.WHITE,
          }}
        >
          <Languages size={16} color={COLORS.GRAY_500} />
          <select
            value={i18n.language.startsWith("fr") ? "fr" : "en"}
            onChange={(e) => setAppLanguage(e.target.value as "en" | "fr")}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "12px",
              color: COLORS.GRAY_800,
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
            color: COLORS.GRAY_500,
            display: "flex",
            alignItems: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.GRAY_100;
            e.currentTarget.style.color = COLORS.GRAY_800;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = COLORS.GRAY_500;
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
            background: COLORS.GRAY_100,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: COLORS.RED,
              color: COLORS.WHITE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
              {user?.name || user?.email || "Admin"}
            </div>
            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>Administrator</div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: "none",
            border: `1px solid ${COLORS.GRAY_200}`,
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: "8px",
            color: COLORS.GRAY_500,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.RED_LIGHT;
            e.currentTarget.style.borderColor = COLORS.RED_BORDER;
            e.currentTarget.style.color = COLORS.RED;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.borderColor = COLORS.GRAY_200;
            e.currentTarget.style.color = COLORS.GRAY_500;
          }}
        >
          <LogOut size={16} />
          {t("nav.logout")}
        </button>
      </div>
    </nav>
  );
}

