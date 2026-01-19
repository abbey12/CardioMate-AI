import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getFacilityDashboard,
  getFacilityReports,
  exportReportsCsv,
  getAnalyticsSummary,
  getFacilityWallet,
  getPricing,
  getFacilityReferralCode,
  getFacilityReferralStats,
  getFacilityProfile,
  getVolumeData,
  type AnalyticsSummary,
  type ReferralStats,
  type VolumeDataPoint,
} from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import {
  FileText,
  Activity,
  AlertTriangle,
  Search,
  Eye,
  Calendar,
  FileDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  Clock,
  ArrowRight,
  BarChart3,
  List,
  Upload,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wallet,
  DollarSign,
  Zap,
  UserPlus,
  Copy,
  Gift,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { EcgStructuredReport } from "../../ui/types";
import { COLORS } from "../../ui/colors";
import { useTranslation } from "react-i18next";

export function FacilityDashboard() {
  const { token, isFacility, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  // Dashboard data
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ["facilityDashboard"],
    queryFn: () => getFacilityDashboard(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Analytics summary for enhanced stats
  const { data: analyticsSummary, isLoading: analyticsLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["analyticsSummary", "dashboard"],
    queryFn: () => getAnalyticsSummary(token!, undefined, undefined, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Volume data for charts (last 30 days)
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  }, []);

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeDataPoint[]>({
    queryKey: ["volumeData", "dashboard", "daily"],
    queryFn: () => getVolumeData(token!, "daily", thirtyDaysAgo, undefined, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Wallet data
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", "dashboard"],
    queryFn: () => getFacilityWallet(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Referral data
  const { data: referralCode, isLoading: referralCodeLoading } = useQuery({
    queryKey: ["referralCode", "dashboard"],
    queryFn: () => getFacilityReferralCode(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: referralStats, isLoading: referralStatsLoading } = useQuery<ReferralStats>({
    queryKey: ["referralStats", "dashboard"],
    queryFn: () => getFacilityReferralStats(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Pricing data
  const { data: pricing, isLoading: pricingLoading } = useQuery({
    queryKey: ["pricing", "dashboard"],
    queryFn: () => getPricing(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["facilityProfile"],
    queryFn: () => getFacilityProfile(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  // Reports data
  const { data: reportsData, isLoading: reportsLoading, error: reportsError, refetch: refetchReports } = useQuery({
    queryKey: ["facilityReports", currentPage, pageSize, fromDate, toDate],
    queryFn: () =>
      getFacilityReports(
        token!,
        {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
        handleTokenRefresh
      ),
    enabled: !!token && isFacility,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
        return false;
      }
      return failureCount < 2;
    },
  });

  const reports = reportsData?.reports || [];
  const totalReports = reportsData?.total || 0;
  const totalPages = Math.ceil(totalReports / pageSize);

  if (!isFacility || !token) {
    return null;
  }

  // Calculate enhanced stats
  const dashboardTotalReports = dashboard?.totalReports || 0;
  
  // Time-based metrics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const reportsToday = reports.filter((r) => new Date(r.createdAt) >= today).length;
  const reportsThisWeek = reports.filter((r) => new Date(r.createdAt) >= thisWeekStart).length;
  const reportsThisMonth = reports.filter((r) => new Date(r.createdAt) >= thisMonthStart).length;
  const reportsLastWeek = reports.filter((r) => {
    const reportDate = new Date(r.createdAt);
    return reportDate >= lastWeekStart && reportDate < thisWeekStart;
  }).length;
  const reportsLastMonth = reports.filter((r) => {
    const reportDate = new Date(r.createdAt);
    return reportDate >= lastMonthStart && reportDate < thisMonthStart;
  }).length;

  const recentReportsCount = reports.filter((r) => {
    const reportDate = new Date(r.createdAt);
    return reportDate >= sevenDaysAgo;
  }).length;

  const abnormalitiesCount = reports.reduce((sum, r) => sum + (r.abnormalities?.length || 0), 0);
  const normalReportsCount = reports.filter((r) => (r.abnormalities?.length || 0) === 0).length;
  const abnormalReportsCount = reports.filter((r) => (r.abnormalities?.length || 0) > 0).length;

  // Calculate trends
  const weekTrend = reportsLastWeek > 0 
    ? ((reportsThisWeek - reportsLastWeek) / reportsLastWeek) * 100 
    : 0;
  const monthTrend = reportsLastMonth > 0 
    ? ((reportsThisMonth - reportsLastMonth) / reportsLastMonth) * 100 
    : 0;

  // Format volume data for chart
  const chartData = useMemo(() => {
    if (!volumeData || volumeData.length === 0) return [];
    return volumeData.slice(-14).map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reports: item.count,
    }));
  }, [volumeData]);

  // Filter reports by search
  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const query = searchQuery.toLowerCase();
    return reports.filter(
      (report) =>
        report.patient?.name?.toLowerCase().includes(query) ||
        report.id.toLowerCase().includes(query) ||
        report.measurements.rhythm?.toLowerCase().includes(query)
    );
  }, [reports, searchQuery]);

  const handleExportCsv = async () => {
    try {
      await exportReportsCsv(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh);
    } catch (err: any) {
      if (err?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
      } else {
        alert(err?.message || "Failed to export CSV");
      }
    }
  };

  const handleDateFilterChange = () => {
    setCurrentPage(1);
  };

  const isLoading = dashboardLoading || reportsLoading;
  const hasError = dashboardError || reportsError;
  const requiredProfileFields = [
    profile?.phone,
    profile?.addressLine1,
    profile?.city,
    profile?.country,
    profile?.facilityType,
    profile?.contactName,
    profile?.contactPhone,
  ];
  const missingProfileCount = requiredProfileFields.filter((value) => !value).length;
  const isProfileComplete = missingProfileCount === 0;

  return (
    <Layout>
      <div style={{ maxWidth: "100%" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
              {t("facilityDashboard.title")}
            </h1>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
              {t("facilityDashboard.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              to="/facility/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#ffffff",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <List size={16} />
              {t("facilityDashboard.actions.viewAllReports")}
            </Link>
            <Link
              to="/facility/analytics"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "#ffffff",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <BarChart3 size={16} />
              {t("facilityDashboard.actions.analytics")}
            </Link>
                <Link
                  to="/facility/upload"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    background: "#dc2626",
                    color: "white",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#b91c1c";
                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#dc2626";
                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                  }}
                >
              <Upload size={16} />
              {t("facilityDashboard.actions.uploadNew")}
            </Link>
          </div>
        </div>

        {!isProfileComplete && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertTriangle size={20} color="#d97706" />
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#92400e" }}>
                  {t("facilityDashboard.banner.completeSignup")}
                </div>
                <div style={{ fontSize: "12px", color: "#a16207" }}>
                  {t("facilityDashboard.banner.missingFields", { count: missingProfileCount })}
                </div>
              </div>
            </div>
            <Link
              to="/facility/settings"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                background: "#f59e0b",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {t("facilityDashboard.banner.completeNow")}
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <XCircle size={20} color="#dc2626" />
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#991b1b", marginBottom: "4px" }}>
                  {t("facilityDashboard.errors.loadTitle")}
                </div>
                <div style={{ fontSize: "13px", color: "#b91c1c" }}>
                  {(dashboardError as any)?.message ||
                    (reportsError as any)?.message ||
                    t("facilityDashboard.errors.unexpected")}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                refetchDashboard();
                refetchReports();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#b91c1c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#dc2626";
              }}
            >
              <RefreshCw size={14} />
              {t("facilityDashboard.errors.retry")}
            </button>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Wallet Balance Card */}
          <EnhancedStatCard
            icon={Wallet}
            label={t("facilityDashboard.stats.walletBalance")}
            value={wallet ? `₵${Number(wallet.balance || 0).toFixed(2)}` : "—"}
            color="#10b981"
            loading={walletLoading}
            subtitle={
              wallet && pricing
                ? t("facilityDashboard.stats.analysesRemaining", {
                    count: Math.floor(Number(wallet.balance || 0) / pricing.standard),
                  })
                : undefined
            }
            action={
              <Link
                to="/facility/wallet"
                style={{
                  fontSize: "12px",
                  color: "#10b981",
                  textDecoration: "none",
                  fontWeight: "500",
                  marginTop: "8px",
                  display: "inline-block",
                }}
              >
                Top Up →
              </Link>
            }
          />
          <EnhancedStatCard
            icon={FileText}
            label={t("facilityDashboard.stats.totalReports")}
            value={dashboardTotalReports}
            color="#dc2626"
            loading={dashboardLoading}
            trend={analyticsSummary ? {
              value: analyticsSummary.reportsLast7Days,
              label: "Last 7 days",
            } : undefined}
          />
          <EnhancedStatCard
            icon={CheckCircle2}
            label={t("facilityDashboard.stats.normalReports")}
            value={analyticsSummary?.normalReports || normalReportsCount}
            color="#16a34a"
            loading={analyticsLoading || dashboardLoading}
            subtitle={analyticsSummary?.totalReports ? `${Math.round((analyticsSummary.normalReports / analyticsSummary.totalReports) * 100)}% of total` : undefined}
          />
          <EnhancedStatCard
            icon={AlertTriangle}
            label={t("facilityDashboard.stats.abnormalReports")}
            value={analyticsSummary?.abnormalReports || abnormalReportsCount}
            color="#dc2626"
            loading={analyticsLoading || dashboardLoading}
            subtitle={analyticsSummary?.totalReports ? `${Math.round((analyticsSummary.abnormalReports / analyticsSummary.totalReports) * 100)}% of total` : undefined}
          />
          <EnhancedStatCard
            icon={Calendar}
            label={t("facilityDashboard.stats.last7Days")}
            value={analyticsSummary?.reportsLast7Days || recentReportsCount}
            color="#10b981"
            loading={analyticsLoading || dashboardLoading}
            trend={analyticsSummary ? {
              value: analyticsSummary.reportsLast30Days,
              label: "Last 30 days",
            } : undefined}
          />
          {analyticsSummary?.averageHeartRate && (
            <EnhancedStatCard
              icon={Heart}
              label={t("facilityDashboard.stats.avgHeartRate")}
              value={t("facilityDashboard.cards.bpmValue", { value: Math.round(analyticsSummary.averageHeartRate) })}
              color="#f59e0b"
              loading={analyticsLoading}
            />
          )}
          {analyticsSummary?.averageAge && (
            <EnhancedStatCard
              icon={Users}
              label={t("facilityDashboard.stats.avgPatientAge")}
              value={`${Math.round(analyticsSummary.averageAge)} years`}
              color="#8b5cf6"
              loading={analyticsLoading}
            />
          )}
        </div>

        {/* Quick Insights */}
        {analyticsSummary && analyticsSummary.totalReports > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              marginBottom: "32px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 16px 0" }}>
              Quick Insights
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  {t("facilityDashboard.stats.abnormalityRate")}
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                  {analyticsSummary.totalReports > 0
                    ? `${Math.round((analyticsSummary.abnormalReports / analyticsSummary.totalReports) * 100)}%`
                    : "0%"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  {analyticsSummary.abnormalReports} of {analyticsSummary.totalReports} reports
                </div>
              </div>
              {analyticsSummary.mostCommonAbnormality && (
                <div style={{ padding: "16px", background: "#fef2f2", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                    {t("facilityDashboard.analytics.mostCommonFinding")}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#dc2626" }}>
                    {analyticsSummary.mostCommonAbnormality}
                  </div>
                </div>
              )}
              <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  {t("facilityDashboard.analytics.activityTrend")}
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#16a34a" }}>
                  {analyticsSummary.reportsLast7Days > 0 ? (
                    <>
                      <TrendingUp size={16} style={{ display: "inline", verticalAlign: "middle" }} />
                      {analyticsSummary.reportsLast7Days} this week
                    </>
                  ) : (
                    "No activity"
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  {analyticsSummary.reportsLast30Days} in last 30 days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referral Program Section */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            padding: "32px",
            marginBottom: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                {t("facilityDashboard.referrals.title")}
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                {t("facilityDashboard.referrals.subtitle")}
              </p>
            </div>
            <Link
              to="/facility/referrals"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
              }}
            >
              {t("facilityDashboard.referrals.viewDetails")}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            {/* Referral Code Card */}
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.RED_LIGHT} 0%, ${COLORS.BLUE_LIGHT} 100%)`,
                borderRadius: "12px",
                padding: "24px",
                border: `1px solid ${COLORS.GRAY_200}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: `${COLORS.RED}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={24} color={COLORS.RED} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                    {t("facilityDashboard.referrals.codeLabel")}
                  </div>
                  {referralCodeLoading ? (
                    <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_300 }}>
                      {t("facilityDashboard.referrals.loading")}
                    </div>
                  ) : referralCode?.referralCode ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "700",
                          color: COLORS.GRAY_800,
                          fontFamily: "monospace",
                          letterSpacing: "2px",
                        }}
                      >
                        {referralCode.referralCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode.referralCode);
                          alert(t("facilityDashboard.referrals.copied"));
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: COLORS.WHITE,
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500",
                          color: COLORS.GRAY_700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = COLORS.GRAY_50;
                          e.currentTarget.style.borderColor = COLORS.RED;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.WHITE;
                          e.currentTarget.style.borderColor = COLORS.GRAY_200;
                        }}
                      >
                          <Copy size={14} />
                          {t("facilityDashboard.referrals.copy")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "16px", color: COLORS.GRAY_400 }}>
                      {t("facilityDashboard.referrals.noCode")}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: "12px", color: COLORS.GRAY_500, margin: 0, lineHeight: "1.5" }}>
                Share this code with other facilities. When they sign up using your code, you'll both receive bonuses!
              </p>
            </div>

            {/* Referral Stats */}
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "12px",
                padding: "24px",
                border: `1px solid ${COLORS.GRAY_200}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: `${COLORS.BLUE}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Gift size={24} color={COLORS.BLUE} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                    {t("facilityDashboard.referrals.earnings")}
                  </div>
                  {referralStatsLoading ? (
                    <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_300 }}>
                      {t("facilityDashboard.referrals.loading")}
                    </div>
                  ) : (
                    <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                      ₵{referralStats?.totalReferralBonus.toFixed(2) || "0.00"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                    {t("facilityDashboard.referrals.total")}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                    {referralStats?.totalReferrals || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                    {t("facilityDashboard.referrals.thisMonth")}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                    {referralStats?.referrals.filter(
                      (r) => new Date(r.createdAt).getMonth() === new Date().getMonth()
                    ).length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Referrals Table */}
          {referralStats && referralStats.referrals.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "16px" }}>
                {t("facilityDashboard.referrals.recent")}
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.GRAY_50 }}>
                      <th
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: COLORS.GRAY_500,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("facilityDashboard.referrals.table.facility")}
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: COLORS.GRAY_500,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("facilityDashboard.referrals.table.bonus")}
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: COLORS.GRAY_500,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("facilityDashboard.referrals.table.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralStats.referrals.slice(0, 5).map((referral, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: index < Math.min(5, referralStats.referrals.length) - 1 ? `1px solid ${COLORS.GRAY_200}` : "none",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                              {referral.referredFacilityName}
                            </div>
                            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{referral.referredFacilityEmail}</div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.BLUE }}>
                            ₵{referral.bonusAmount.toFixed(2)}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ fontSize: "13px", color: COLORS.GRAY_600 }}>
                            {new Date(referral.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 16px 0" }}>
            {t("facilityDashboard.quickActions.title")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <QuickActionLink
              to="/facility/upload"
              icon={Upload}
              label={t("facilityDashboard.quickActions.upload")}
              description={t("facilityDashboard.quickActions.uploadDesc")}
              color="#dc2626"
            />
            <QuickActionLink
              to="/facility/reports"
              icon={List}
              label={t("facilityDashboard.quickActions.reports")}
              description={t("facilityDashboard.quickActions.reportsDesc")}
              color="#10b981"
            />
            <QuickActionLink
              to="/facility/analytics"
              icon={BarChart3}
              label={t("facilityDashboard.quickActions.analytics")}
              description={t("facilityDashboard.quickActions.analyticsDesc")}
              color="#f59e0b"
            />
            <QuickActionLink
              to="/facility/settings"
              icon={Activity}
              label={t("facilityDashboard.quickActions.settings")}
              description={t("facilityDashboard.quickActions.settingsDesc")}
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* Recent Activity / Reports Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px 0" }}>
                {t("facilityDashboard.recentReports.title")}
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                {t("facilityDashboard.recentReports.showing", {
                  shown: filteredReports.length,
                  total: totalReports,
                  count: totalReports,
                })}
              </p>
            </div>
            <Link
              to="/facility/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "#f8fafc",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              {t("facilityDashboard.recentReports.viewAll")}
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Filters and Search */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "end" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="text"
                  placeholder={t("facilityDashboard.filters.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#ffffff",
                    color: "#1e293b",
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* From Date */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                  {t("facilityDashboard.filters.fromDate")}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    handleDateFilterChange();
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#ffffff",
                    color: "#1e293b",
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* To Date */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                  {t("facilityDashboard.filters.toDate")}
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    handleDateFilterChange();
                  }}
                  min={fromDate}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#ffffff",
                    color: "#1e293b",
                    outline: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCsv}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#059669";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#10b981";
                }}
              >
                <FileDown size={16} />
                {t("facilityDashboard.filters.exportCsv")}
              </button>
            </div>
          </div>

          {/* Reports Table */}
          {reportsLoading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <div style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                <RefreshCw size={24} color="#64748b" />
              </div>
              <div style={{ marginTop: "12px", fontSize: "14px" }}>
                {t("facilityDashboard.recentReports.loading")}
              </div>
            </div>
          ) : filteredReports.length > 0 ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.dateTime")}
                      </th>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.patient")}
                      </th>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.heartRate")}
                      </th>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.rhythm")}
                      </th>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.status")}
                      </th>
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {t("facilityDashboard.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <TableRow key={report.id} report={report} index={index} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    padding: "20px 24px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>
                      {t("facilityDashboard.pagination.rowsPerPage")}
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        background: "#ffffff",
                        color: "#1e293b",
                        cursor: "pointer",
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          background: currentPage === 1 ? "#f8fafc" : "#ffffff",
                          color: currentPage === 1 ? "#94a3b8" : "#1e293b",
                          cursor: currentPage === 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          background: currentPage === totalPages ? "#f8fafc" : "#ffffff",
                          color: currentPage === totalPages ? "#94a3b8" : "#1e293b",
                          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== totalPages) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== totalPages) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </Layout>
  );
}

function EnhancedStatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
  subtitle,
  trend,
  action,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  loading: boolean;
  subtitle?: string;
  trend?: { value: number; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.2s",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={color} strokeWidth={2} />
        </div>
        {trend && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            {("isPositive" in trend) ? (
              <>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px",
                  fontSize: "12px", 
                  fontWeight: "600", 
                  color: trend.isPositive ? "#16a34a" : "#dc2626"
                }}>
                  {trend.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {trend.value}%
                </div>
                {trend.label && (
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{trend.label}</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: "12px", fontWeight: "600", color: color }}>
                  {typeof trend.value === "number" ? trend.value.toLocaleString() : trend.value}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>{trend.label}</div>
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>
        {loading ? (
          <span style={{ color: "#94a3b8" }}>—</span>
        ) : typeof value === "number" ? (
          value.toLocaleString()
        ) : (
          value
        )}
      </div>
      <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>{label}</div>
      {subtitle && (
        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{subtitle}</div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

function QuickActionLink({
  to,
  icon: Icon,
  label,
  description,
  color,
}: {
  to: string;
  icon: any;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "16px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        textDecoration: "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f8fafc";
        e.currentTarget.style.borderColor = "#cbd5e1";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#ffffff";
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "8px",
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>{description}</div>
      </div>
      <ArrowRight size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: "2px" }} />
    </Link>
  );
}

function TableRow({ report, index }: { report: EcgStructuredReport; index: number }) {
  const { t } = useTranslation();
  const hasAbnormalities = (report.abnormalities?.length || 0) > 0;
  const date = new Date(report.createdAt);

  return (
    <tr
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
        transition: "all 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f1f5f9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      }}
      onClick={() => {
        window.location.href = `/facility/reports/${report.id}`;
      }}
    >
      <td style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b", marginBottom: "4px" }}>
          {date.toLocaleDateString()}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
          {report.patient?.name || "—"}
        </div>
        {report.patient?.medicalRecordNumber && (
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {t("facilityDashboard.report.mrn", { mrn: report.patient.medicalRecordNumber })}
          </div>
        )}
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
          {report.measurements.heartRateBpm || "—"}
          {report.measurements.heartRateBpm && (
            <span style={{ fontSize: "12px", fontWeight: "400", color: "#64748b", marginLeft: "4px" }}>
              {t("facilityDashboard.units.bpm")}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: "14px", color: "#1e293b" }}>{report.measurements.rhythm || "—"}</div>
      </td>
      <td style={{ padding: "16px 24px" }}>
        {hasAbnormalities ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "12px",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <AlertTriangle size={14} />
            {t("facilityDashboard.table.findings", { count: report.abnormalities.length })}
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "12px",
              background: "#f0fdf4",
              color: "#16a34a",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <CheckCircle2 size={14} />
            {t("facilityDashboard.table.normal")}
          </span>
        )}
      </td>
      <td
        style={{ padding: "16px 24px", textAlign: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Link
            to={`/facility/reports/${report.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#dc2626",
              color: "white",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#dc2626";
            }}
          >
            <Eye size={14} />
            {t("facilityDashboard.table.view")}
          </Link>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div style={{ padding: "80px 40px", textAlign: "center" }}>
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <FileText size={32} color="#94a3b8" />
      </div>
      <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0" }}>
        {searchQuery
          ? t("facilityDashboard.recentReports.noResults")
          : t("facilityDashboard.recentReports.empty")}
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#64748b",
          margin: "0 0 24px 0",
          maxWidth: "400px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {searchQuery
          ? "Try adjusting your search terms or date filters"
          : "Get started by uploading your first ECG for AI-powered interpretation"}
      </p>
      {!searchQuery && (
        <Link
          to="/facility/upload"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            background: "#dc2626",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#b91c1c";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#dc2626";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
          }}
        >
          <Upload size={16} />
          Upload Your First ECG
        </Link>
      )}
    </div>
  );
}
