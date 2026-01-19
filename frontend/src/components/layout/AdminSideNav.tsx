import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, FileText, BarChart3, Settings, DollarSign, Shield, CreditCard, Activity, Globe } from "lucide-react";
import { COLORS } from "../../ui/colors";

const navItems = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "sideNav.dashboard" },
  { path: "/admin/facilities", icon: Users, label: "sideNav.facilities" },
  { path: "/admin/reports", icon: FileText, label: "sideNav.reports" },
  { path: "/admin/revenue", icon: DollarSign, label: "sideNav.revenue" },
  { path: "/admin/analytics", icon: BarChart3, label: "sideNav.analytics" },
  { path: "/admin/country-pricing", icon: Globe, label: "sideNav.countryPricing" },
  { path: "/admin/payments", icon: CreditCard, label: "sideNav.paymentOps" },
  { path: "/admin/ops", icon: Activity, label: "sideNav.opsStatus" },
  { path: "/admin/audit-logs", icon: Shield, label: "sideNav.auditLogs" },
  { path: "/admin/settings", icon: Settings, label: "sideNav.settings" },
];

export function AdminSideNav() {
  const { t } = useTranslation();
  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: "64px",
        bottom: 0,
        width: "256px",
        background: COLORS.WHITE,
        borderRight: `1px solid ${COLORS.GRAY_200}`,
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
                color: isActive ? COLORS.RED : COLORS.GRAY_500,
                background: isActive ? COLORS.RED_LIGHT : "transparent",
                fontWeight: isActive ? "600" : "500",
                fontSize: "14px",
                transition: "all 0.2s",
              })}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                if (!target.classList.contains("active")) {
                  target.style.background = COLORS.GRAY_100;
                  target.style.color = COLORS.GRAY_800;
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                if (!target.classList.contains("active")) {
                  target.style.background = "transparent";
                  target.style.color = COLORS.GRAY_500;
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

