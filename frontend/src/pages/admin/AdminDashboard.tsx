import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats, getFacilities, getAllReports, getPricingConfig, updatePricing, getBonusSettings, getAdminVolumeData, type Facility, type PricingConfig, type BonusSettings, type VolumeDataPoint } from "../../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { useTranslation } from "react-i18next";
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
import {
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Eye,
  Search,
  Calendar,
  RefreshCw,
  XCircle,
  ArrowRight,
  BarChart3,
  List,
  DollarSign,
  CreditCard,
  Settings,
  Edit,
  Save,
  X,
  Loader2,
  Gift,
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { COLORS } from "../../ui/colors";

type EnhancedStatCardProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: number | string;
  color: string;
  loading?: boolean;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
};

function EnhancedStatCard({ icon: Icon, label, value, color, loading, trend, subtitle }: EnhancedStatCardProps) {
  return (
    <div
      style={{
        background: COLORS.WHITE,
        borderRadius: "16px",
        padding: "24px",
        border: `1px solid ${COLORS.GRAY_200}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={color} />
        </div>
        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: trend.isPositive ? COLORS.SUCCESS : COLORS.ERROR,
              fontWeight: "600",
            }}
          >
            <TrendingUp size={14} />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "8px", fontWeight: "500" }}>
        {label}
      </div>
      {loading ? (
        <div style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
      ) : (
        <div style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800 }}>{value}</div>
      )}
      {subtitle && (
        <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "8px" }}>{subtitle}</div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<{ type: "standard" | "image"; price: number } | null>(null);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => getAdminStats(token!),
    enabled: !!token && isAdmin,
  });

  const { data: facilities, isLoading: facilitiesLoading, refetch: refetchFacilities } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: () => getFacilities(token!),
    enabled: !!token && isAdmin,
  });

  const { data: allReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["allReports", "dashboard"],
    queryFn: () => getAllReports(token!),
    enabled: !!token && isAdmin,
  });

  const { data: pricing, isLoading: pricingLoading } = useQuery<PricingConfig[]>({
    queryKey: ["pricingConfig"],
    queryFn: () => getPricingConfig(token!, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: bonusSettings, isLoading: bonusSettingsLoading } = useQuery<BonusSettings>({
    queryKey: ["bonusSettings", "dashboard"],
    queryFn: () => getBonusSettings(token!, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  // Get volume data for charts (last 30 days)
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  }, []);

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeDataPoint[]>({
    queryKey: ["adminVolumeData", "dashboard", "daily"],
    queryFn: () => getAdminVolumeData(token!, "daily", thirtyDaysAgo, undefined, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ analysisType, pricePerAnalysis }: { analysisType: "standard" | "image"; pricePerAnalysis: number }) =>
      updatePricing(token!, analysisType, pricePerAnalysis, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricingConfig"] });
      setEditingPricing(null);
      setShowPricingModal(false);
    },
  });

  if (!isAdmin || !token) {
    return null;
  }

  // Calculate enhanced stats
  const totalFacilities = stats?.totalFacilities || 0;
  const totalReports = stats?.totalReports || 0;
  const revenue = stats?.revenue;
  const totalRevenue = revenue?.totalRevenue || 0;
  const revenueFromTopUps = revenue?.revenueFromTopUps || 0;
  const revenueFromAnalysis = revenue?.revenueFromAnalysis || 0;
  const totalTopUps = revenue?.totalTopUps || 0;
  const totalAnalyses = revenue?.totalAnalyses || 0;
  
  // Time-based metrics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);

  const reportsToday = allReports?.filter((r) => new Date(r.createdAt) >= today).length || 0;
  const reportsThisWeek = allReports?.filter((r) => new Date(r.createdAt) >= thisWeekStart).length || 0;
  const reportsThisMonth = allReports?.filter((r) => new Date(r.createdAt) >= thisMonthStart).length || 0;
  const reportsLastWeek = allReports?.filter((r) => {
    const date = new Date(r.createdAt);
    return date >= lastWeekStart && date < thisWeekStart;
  }).length || 0;
  const reportsLastMonth = allReports?.filter((r) => {
    const date = new Date(r.createdAt);
    return date >= lastMonthStart && date < thisMonthStart;
  }).length || 0;

  const weekGrowth = reportsLastWeek > 0 ? ((reportsThisWeek - reportsLastWeek) / reportsLastWeek) * 100 : 0;
  const monthGrowth = reportsLastMonth > 0 ? ((reportsThisMonth - reportsLastMonth) / reportsLastMonth) * 100 : 0;
  
  const recentReports = allReports?.filter((r) => {
    const reportDate = new Date(r.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return reportDate >= sevenDaysAgo;
  }).length || 0;
  const activeFacilities = facilities?.filter((f) => {
    // Consider a facility active if it has reports in the last 30 days
    const facilityReports = allReports?.filter((r) => {
      // We'd need facility_id in reports to filter properly
      // For now, just return all facilities as active
      return true;
    });
    return (facilityReports?.length || 0) > 0;
  }).length || totalFacilities;

  // Recent activity (last 10 reports)
  const recentActivity = useMemo(() => {
    return allReports
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((report) => ({
        id: report.id,
        type: "report",
        message: `New ECG report generated`,
        timestamp: report.createdAt,
        facilityId: (report as any).facilityId,
      })) || [];
  }, [allReports]);

  const standardPricing = pricing?.find((p) => p.analysisType === "standard");
  const imagePricing = pricing?.find((p) => p.analysisType === "image");

  // Filter facilities by search
  const filteredFacilities = facilities?.filter((facility) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      facility.name.toLowerCase().includes(query) ||
      facility.email.toLowerCase().includes(query)
    );
  }) || [];

  // Get recent facilities (last 5)
  const recentFacilities = facilities?.slice(0, 5) || [];

  const isLoading = statsLoading || facilitiesLoading || reportsLoading;
  const hasError = statsError;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        {/* Page Header */}
        <div
          style={{
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              Admin Dashboard
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              Platform overview and facility management
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              to="/admin/facilities"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_500,
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.GRAY_50;
                e.currentTarget.style.borderColor = COLORS.GRAY_300;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.WHITE;
                e.currentTarget.style.borderColor = COLORS.GRAY_200;
              }}
            >
              <List size={16} />
              All Facilities
            </Link>
            <Link
              to="/admin/analytics"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_500,
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.GRAY_50;
                e.currentTarget.style.borderColor = COLORS.GRAY_300;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.WHITE;
                e.currentTarget.style.borderColor = COLORS.GRAY_200;
              }}
            >
              <BarChart3 size={16} />
              Analytics
            </Link>
            <Link
              to="/admin/facilities"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
              }}
            >
              <Plus size={16} />
              Create Facility
            </Link>
          </div>
        </div>

        {/* Error State */}
        {hasError && (
          <div
            style={{
              background: COLORS.RED_LIGHT,
              border: `1px solid ${COLORS.RED_BORDER}`,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <XCircle size={20} color={COLORS.RED} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#991b1b", marginBottom: "4px" }}>
                  Error loading dashboard data
                </div>
                <div style={{ fontSize: "13px", color: COLORS.RED_DARK }}>
                  {(statsError as any)?.message || "An unexpected error occurred"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                refetchStats();
                refetchFacilities();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
              }}
            >
              <RefreshCw size={14} />
              Retry
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
          <EnhancedStatCard
            icon={Users}
            label="Total Facilities"
            value={totalFacilities}
            color={COLORS.RED}
            loading={isLoading}
            subtitle={`${activeFacilities} active`}
          />
          <EnhancedStatCard
            icon={FileText}
            label="Total Reports"
            value={totalReports}
            color={COLORS.BLUE}
            loading={isLoading}
            subtitle={`${recentReports} in last 7 days`}
            trend={weekGrowth !== 0 ? { value: Math.abs(weekGrowth), isPositive: weekGrowth > 0 } : undefined}
          />
          <EnhancedStatCard
            icon={DollarSign}
            label="Total Revenue"
            value={`₵${totalRevenue.toFixed(2)}`}
            color={COLORS.SUCCESS}
            loading={isLoading}
            subtitle={`${totalTopUps} top-ups`}
          />
          <EnhancedStatCard
            icon={CreditCard}
            label="Analysis Revenue"
            value={`₵${revenueFromAnalysis.toFixed(2)}`}
            color={COLORS.WARNING}
            loading={isLoading}
            subtitle={`${totalAnalyses} analyses`}
          />
        </div>

        {/* Time-Based Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.RED}15 0%, ${COLORS.RED}05 100%)`,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${COLORS.RED}20`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Clock size={16} color={COLORS.RED} />
              <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>Today</div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{reportsToday}</div>
            <div style={{ fontSize: "11px", color: COLORS.GRAY_500, marginTop: "4px" }}>Reports generated</div>
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.BLUE}15 0%, ${COLORS.BLUE}05 100%)`,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${COLORS.BLUE}20`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Calendar size={16} color={COLORS.BLUE} />
              <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>This Week</div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{reportsThisWeek}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              {weekGrowth !== 0 && (
                <>
                  {weekGrowth > 0 ? (
                    <TrendingUp size={12} color={COLORS.SUCCESS} />
                  ) : (
                    <TrendingDown size={12} color={COLORS.ERROR} />
                  )}
                  <div
                    style={{
                      fontSize: "11px",
                      color: weekGrowth > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                      fontWeight: "600",
                    }}
                  >
                    {Math.abs(weekGrowth).toFixed(1)}% vs last week
                  </div>
                </>
              )}
            </div>
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.SUCCESS}15 0%, ${COLORS.SUCCESS}05 100%)`,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${COLORS.SUCCESS}20`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <BarChart3 size={16} color={COLORS.SUCCESS} />
              <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>This Month</div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{reportsThisMonth}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              {monthGrowth !== 0 && (
                <>
                  {monthGrowth > 0 ? (
                    <TrendingUp size={12} color={COLORS.SUCCESS} />
                  ) : (
                    <TrendingDown size={12} color={COLORS.ERROR} />
                  )}
                  <div
                    style={{
                      fontSize: "11px",
                      color: monthGrowth > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                      fontWeight: "600",
                    }}
                  >
                    {Math.abs(monthGrowth).toFixed(1)}% vs last month
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Report Volume Chart */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              padding: "24px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                Report Volume (Last 30 Days)
              </h3>
              <p style={{ fontSize: "13px", color: COLORS.GRAY_500, margin: 0 }}>Daily report generation trend</p>
            </div>
            {volumeLoading ? (
              <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={24} color={COLORS.GRAY_400} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : volumeData && volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis
                    dataKey="date"
                    stroke={COLORS.GRAY_500}
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis stroke={COLORS.GRAY_500} style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.WHITE,
                      border: `1px solid ${COLORS.GRAY_200}`,
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.RED}
                    strokeWidth={2}
                    dot={{ fill: COLORS.RED, r: 4 }}
                    name="Reports"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.GRAY_400 }}>
                No data available
              </div>
            )}
          </div>

          {/* Quick Insights */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              padding: "24px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                Quick Insights
              </h3>
              <p style={{ fontSize: "13px", color: COLORS.GRAY_500, margin: 0 }}>Platform performance highlights</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  padding: "16px",
                  background: COLORS.GRAY_50,
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: `${COLORS.SUCCESS}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle2 size={20} color={COLORS.SUCCESS} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {activeFacilities} Active Facilities
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "2px" }}>
                      {totalFacilities > 0 ? `${((activeFacilities / totalFacilities) * 100).toFixed(0)}% of total facilities` : "No facilities yet"}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "16px",
                  background: COLORS.GRAY_50,
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: `${COLORS.BLUE}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Zap size={20} color={COLORS.BLUE} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {reportsToday} Reports Today
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "2px" }}>
                      {reportsToday > 0 ? "Platform is active" : "No reports generated today"}
                    </div>
                  </div>
                </div>
              </div>
              {totalAnalyses > 0 && (
                <div
                  style={{
                    padding: "16px",
                    background: COLORS.GRAY_50,
                    borderRadius: "10px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: `${COLORS.WARNING}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DollarSign size={20} color={COLORS.WARNING} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                        ₵{revenueFromAnalysis.toFixed(2)} from Analyses
                      </div>
                      <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "2px" }}>
                        {totalAnalyses} total analyses performed
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "32px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                Recent Activity
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>Latest platform events and reports</p>
            </div>
            <Link
              to="/admin/reports"
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
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ padding: "24px" }}>
            {reportsLoading ? (
              <div style={{ textAlign: "center", color: COLORS.GRAY_400, padding: "20px" }}>
                <Loader2 size={24} color={COLORS.GRAY_400} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
              </div>
            ) : recentActivity.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px",
                      background: index % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_50,
                      borderRadius: "10px",
                      border: `1px solid ${COLORS.GRAY_200}`,
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: `${COLORS.BLUE}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText size={20} color={COLORS.BLUE} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                        {activity.message}
                      </div>
                      <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "4px" }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Link
                      to={`/admin/reports/${activity.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: COLORS.BLUE_LIGHT,
                        color: COLORS.BLUE,
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.BLUE;
                        e.currentTarget.style.color = COLORS.WHITE;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = COLORS.BLUE_LIGHT;
                        e.currentTarget.style.color = COLORS.BLUE;
                      }}
                    >
                      <Eye size={14} />
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Pricing Management Card */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "32px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                Pricing Configuration
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                Manage analysis pricing for facilities
              </p>
            </div>
            <button
              onClick={() => setShowPricingModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
              }}
            >
              <Settings size={16} />
              {t("adminDashboard.pricing.manage")}
            </button>
          </div>

          <div style={{ padding: "24px" }}>
            {pricingLoading ? (
              <div style={{ textAlign: "center", color: COLORS.GRAY_400, padding: "20px" }}>
                {t("adminDashboard.pricing.loading")}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    padding: "20px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "8px", fontWeight: "500" }}>
                    {t("adminDashboard.pricing.standardTitle")}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    ₵{standardPricing ? Number(standardPricing.pricePerAnalysis).toFixed(2) : "0.00"}
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "4px" }}>
                    {t("adminDashboard.pricing.standardHint")}
                  </div>
                </div>
                <div
                  style={{
                    padding: "20px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "8px", fontWeight: "500" }}>
                    {t("adminDashboard.pricing.imageTitle")}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    ₵{imagePricing ? Number(imagePricing.pricePerAnalysis).toFixed(2) : "0.00"}
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "4px" }}>
                    {t("adminDashboard.pricing.imageHint")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bonus Management Card */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "32px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                {t("adminDashboard.bonuses.title")}
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                {t("adminDashboard.bonuses.subtitle")}
              </p>
            </div>
            <Link
              to="/admin/settings"
              onClick={(e) => {
                // Store that we want to open bonuses tab
                sessionStorage.setItem("adminSettingsTab", "bonuses");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.RED_DARK;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.RED;
              }}
            >
              <Gift size={16} />
              {t("adminDashboard.bonuses.manage")}
            </Link>
          </div>

          <div style={{ padding: "24px" }}>
            {bonusSettingsLoading ? (
              <div style={{ textAlign: "center", color: COLORS.GRAY_400, padding: "20px" }}>
                {t("adminDashboard.bonuses.loading")}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    padding: "20px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: `${COLORS.RED}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Gift size={20} color={COLORS.RED} />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px", fontWeight: "500" }}>
                        {t("adminDashboard.bonuses.signupTitle")}
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                        ₵{bonusSettings?.signupBonus.amount.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "8px" }}>
                    {bonusSettings?.signupBonus.enabled ? (
                      <span style={{ color: COLORS.SUCCESS, fontWeight: "500" }}>
                        {t("adminDashboard.bonuses.enabled")}
                      </span>
                    ) : (
                      <span style={{ color: COLORS.GRAY_400 }}>{t("adminDashboard.bonuses.disabled")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.GRAY_400, marginTop: "4px" }}>
                    {t("adminDashboard.bonuses.signupHint")}
                  </div>
                </div>
                <div
                  style={{
                    padding: "20px",
                    background: COLORS.GRAY_50,
                    borderRadius: "12px",
                    border: `1px solid ${COLORS.GRAY_200}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: `${COLORS.BLUE}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UserPlus size={20} color={COLORS.BLUE} />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px", fontWeight: "500" }}>
                        {t("adminDashboard.bonuses.referralTitle")}
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                        ₵{bonusSettings?.referralBonus.amount.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "8px" }}>
                    {bonusSettings?.referralBonus.enabled ? (
                      <span style={{ color: COLORS.SUCCESS, fontWeight: "500" }}>
                        {t("adminDashboard.bonuses.enabled")}
                      </span>
                    ) : (
                      <span style={{ color: COLORS.GRAY_400 }}>{t("adminDashboard.bonuses.disabled")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.GRAY_400, marginTop: "4px" }}>
                    {t("adminDashboard.bonuses.referralHint")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Facilities */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "32px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                {t("adminDashboard.recentFacilities.title")}
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                {t("adminDashboard.recentFacilities.subtitle")}
              </p>
            </div>
            <Link
              to="/admin/facilities"
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
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {facilitiesLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminDashboard.recentFacilities.loading")}
            </div>
          ) : recentFacilities.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: COLORS.GRAY_500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Facility Name
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: COLORS.GRAY_500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: COLORS.GRAY_500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Created
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "right",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: COLORS.GRAY_500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentFacilities.map((facility, index) => (
                    <tr
                      key={facility.id}
                      style={{
                        borderBottom: index < recentFacilities.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none",
                      }}
                    >
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                          {facility.name}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_600 }}>{facility.email}</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_500 }}>
                          {new Date(facility.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <Link
                          to={`/admin/facilities?facility=${facility.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            background: COLORS.BLUE_LIGHT,
                            color: COLORS.BLUE,
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: "500",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = COLORS.BLUE;
                            e.currentTarget.style.color = COLORS.WHITE;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = COLORS.BLUE_LIGHT;
                            e.currentTarget.style.color = COLORS.BLUE;
                          }}
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              No facilities yet. Create one to get started.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <Link
            to="/admin/facilities"
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "24px",
              border: `1px solid ${COLORS.GRAY_200}`,
              textDecoration: "none",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = COLORS.RED;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = COLORS.GRAY_200;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${COLORS.RED}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={20} color={COLORS.RED} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                  {t("adminDashboard.quickActions.manageFacilities.title")}
                </div>
                <div style={{ fontSize: "13px", color: COLORS.GRAY_500 }}>
                  {t("adminDashboard.quickActions.manageFacilities.subtitle")}
                </div>
              </div>
              <ArrowRight size={18} color={COLORS.GRAY_400} />
            </div>
          </Link>

          <Link
            to="/admin/reports"
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "24px",
              border: `1px solid ${COLORS.GRAY_200}`,
              textDecoration: "none",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = COLORS.BLUE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = COLORS.GRAY_200;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${COLORS.BLUE}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={20} color={COLORS.BLUE} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                  {t("adminDashboard.quickActions.allReports.title")}
                </div>
                <div style={{ fontSize: "13px", color: COLORS.GRAY_500 }}>
                  {t("adminDashboard.quickActions.allReports.subtitle")}
                </div>
              </div>
              <ArrowRight size={18} color={COLORS.GRAY_400} />
            </div>
          </Link>

          <Link
            to="/admin/analytics"
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "24px",
              border: `1px solid ${COLORS.GRAY_200}`,
              textDecoration: "none",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = COLORS.SUCCESS;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = COLORS.GRAY_200;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${COLORS.SUCCESS}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={20} color={COLORS.SUCCESS} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                  {t("adminDashboard.quickActions.analytics.title")}
                </div>
                <div style={{ fontSize: "13px", color: COLORS.GRAY_500 }}>
                  {t("adminDashboard.quickActions.analytics.subtitle")}
                </div>
              </div>
              <ArrowRight size={18} color={COLORS.GRAY_400} />
            </div>
          </Link>
        </div>
      </div>

      {/* Pricing Management Modal */}
      {showPricingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => {
            setShowPricingModal(false);
            setEditingPricing(null);
          }}
        >
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800, margin: 0 }}>
                {t("adminDashboard.pricing.manage")}
              </h2>
              <button
                onClick={() => {
                  setShowPricingModal(false);
                  setEditingPricing(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.GRAY_400,
                  padding: "4px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.GRAY_100;
                  e.currentTarget.style.color = COLORS.GRAY_600;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = COLORS.GRAY_400;
                }}
              >
                <X size={20} />
              </button>
            </div>

            {updatePricingMutation.isError && (
              <div
                style={{
                  background: COLORS.RED_LIGHT,
                  border: `1px solid ${COLORS.RED_BORDER}`,
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: COLORS.RED_DARK,
                  fontSize: "14px",
                }}
              >
                <XCircle size={16} />
                {(updatePricingMutation.error as any)?.message || "Failed to update pricing"}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Standard Pricing */}
              <div
                style={{
                  padding: "20px",
                  background: COLORS.GRAY_50,
                  borderRadius: "12px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {t("adminDashboard.pricing.standardTitle")}
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "4px" }}>
                      {t("adminDashboard.pricing.standardHint")}
                    </div>
                  </div>
                  {editingPricing?.type === "standard" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        value={editingPricing.price}
                        onChange={(e) =>
                          setEditingPricing({ type: "standard", price: parseFloat(e.target.value) || 0 })
                        }
                        min="0.01"
                        step="0.01"
                        style={{
                          width: "120px",
                          padding: "8px 12px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editingPricing.price > 0) {
                            updatePricingMutation.mutate({
                              analysisType: "standard",
                              pricePerAnalysis: editingPricing.price,
                            });
                          }
                        }}
                        disabled={updatePricingMutation.isPending || editingPricing.price <= 0}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: COLORS.RED,
                          color: COLORS.WHITE,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: updatePricingMutation.isPending || editingPricing.price <= 0 ? "not-allowed" : "pointer",
                          opacity: updatePricingMutation.isPending || editingPricing.price <= 0 ? 0.5 : 1,
                        }}
                      >
                        {updatePricingMutation.isPending ? (
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Save size={14} />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPricing(null)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          background: COLORS.GRAY_200,
                          color: COLORS.GRAY_700,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                        ₵{standardPricing ? Number(standardPricing.pricePerAnalysis).toFixed(2) : "0.00"}
                      </div>
                      <button
                        onClick={() => setEditingPricing({ type: "standard", price: standardPricing ? Number(standardPricing.pricePerAnalysis) : 10 })}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: COLORS.BLUE_LIGHT,
                          color: COLORS.BLUE,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Pricing */}
              <div
                style={{
                  padding: "20px",
                  background: COLORS.GRAY_50,
                  borderRadius: "12px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {t("adminDashboard.pricing.imageTitle")}
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginTop: "4px" }}>
                      {t("adminDashboard.pricing.imageHint")}
                    </div>
                  </div>
                  {editingPricing?.type === "image" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        value={editingPricing.price}
                        onChange={(e) =>
                          setEditingPricing({ type: "image", price: parseFloat(e.target.value) || 0 })
                        }
                        min="0.01"
                        step="0.01"
                        style={{
                          width: "120px",
                          padding: "8px 12px",
                          border: `1px solid ${COLORS.GRAY_200}`,
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editingPricing.price > 0) {
                            updatePricingMutation.mutate({
                              analysisType: "image",
                              pricePerAnalysis: editingPricing.price,
                            });
                          }
                        }}
                        disabled={updatePricingMutation.isPending || editingPricing.price <= 0}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: COLORS.RED,
                          color: COLORS.WHITE,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: updatePricingMutation.isPending || editingPricing.price <= 0 ? "not-allowed" : "pointer",
                          opacity: updatePricingMutation.isPending || editingPricing.price <= 0 ? 0.5 : 1,
                        }}
                      >
                        {updatePricingMutation.isPending ? (
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Save size={14} />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPricing(null)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          background: COLORS.GRAY_200,
                          color: COLORS.GRAY_700,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                        ₵{imagePricing ? Number(imagePricing.pricePerAnalysis).toFixed(2) : "0.00"}
                      </div>
                      <button
                        onClick={() => setEditingPricing({ type: "image", price: imagePricing ? Number(imagePricing.pricePerAnalysis) : 16 })}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: COLORS.BLUE_LIGHT,
                          color: COLORS.BLUE,
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  );
}
