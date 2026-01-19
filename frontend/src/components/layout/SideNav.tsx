import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, FileText, Upload, Settings, BarChart3, List, Wallet, UserPlus, Users } from "lucide-react";

const navItems = [
  { path: "/facility/dashboard", icon: LayoutDashboard, label: "sideNav.dashboard" },
  { path: "/facility/reports", icon: List, label: "sideNav.reports" },
  { path: "/facility/upload", icon: Upload, label: "sideNav.upload" },
  { path: "/facility/patients", icon: Users, label: "sideNav.patients" },
  { path: "/facility/analytics", icon: BarChart3, label: "sideNav.analytics" },
  { path: "/facility/referrals", icon: UserPlus, label: "sideNav.referrals" },
  { path: "/facility/wallet", icon: Wallet, label: "sideNav.wallet" },
  { path: "/facility/settings", icon: Settings, label: "sideNav.settings" },
];

export function SideNav() {
  const { t } = useTranslation();
  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: "64px",
        bottom: 0,
        width: "256px",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        padding: "24px 0",
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 12px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                textDecoration: "none",
                color: isActive ? "#dc2626" : "#64748b",
                background: isActive ? "#fef2f2" : "transparent",
                fontWeight: isActive ? "600" : "500",
                fontSize: "14px",
                transition: "all 0.2s",
              })}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                if (!target.classList.contains("active")) {
                  target.style.background = "#f1f5f9";
                  target.style.color = "#1e293b";
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                if (!target.classList.contains("active")) {
                  target.style.background = "transparent";
                  target.style.color = "#64748b";
                }
              }}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{t(item.label)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

