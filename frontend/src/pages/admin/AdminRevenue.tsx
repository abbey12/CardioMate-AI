import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getRevenueStats,
  getRevenueByFacility,
  getRevenueByAnalysisType,
  type RevenueStats,
  type FacilityRevenue,
  type RevenueByAnalysisType,
} from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Activity,
  Download,
  Calendar,
  Building2,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

type MetricCardProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  color: string;
  loading?: boolean;
  subtitle?: string;
};

function MetricCard({ icon: Icon, label, value, color, loading, subtitle }: MetricCardProps) {
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
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
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "4px", fontWeight: "500" }}>
            {label}
          </div>
          {loading ? (
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
          ) : (
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{value}</div>
          )}
          {subtitle && (
            <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "4px" }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminRevenue() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: revenueStats, isLoading: revenueLoading, error: revenueError, refetch: refetchRevenue } = useQuery<RevenueStats>({
    queryKey: ["revenueStats"],
    queryFn: () => getRevenueStats(token!, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: facilityRevenues, isLoading: facilityRevenuesLoading } = useQuery<FacilityRevenue[]>({
    queryKey: ["revenueByFacility"],
    queryFn: () => getRevenueByFacility(token!, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: revenueByType, isLoading: revenueByTypeLoading } = useQuery<RevenueByAnalysisType[]>({
    queryKey: ["revenueByAnalysisType"],
    queryFn: () => getRevenueByAnalysisType(token!, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  const isLoading = revenueLoading || facilityRevenuesLoading || revenueByTypeLoading;
  const hasError = revenueError;

  // Format monthly revenue data for chart
  const monthlyRevenueData = useMemo(() => {
    if (!revenueStats?.revenueByMonth) return [];
    return revenueStats.revenueByMonth
      .slice()
      .reverse()
      .map((item) => ({
        month: new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: Number(item.revenue) || 0,
      }));
  }, [revenueStats]);

  // Format facility revenue data (top 10)
  const topFacilitiesData = useMemo(() => {
    if (!facilityRevenues) return [];
    return facilityRevenues
      .slice(0, 10)
      .map((facility) => ({
        name: facility.facilityName.length > 20 ? facility.facilityName.substring(0, 20) + "..." : facility.facilityName,
        revenue: Number(facility.totalRevenue) || 0,
        topUps: Number(facility.totalTopUpRevenue) || 0,
        analysis: Number(facility.totalAnalysisRevenue) || 0,
      }));
  }, [facilityRevenues]);

  // Format revenue by analysis type for pie chart
  const analysisTypeData = useMemo(() => {
    if (!revenueByType) return [];
    return revenueByType.map((item) => ({
      name: item.analysisType === "standard" ? t("adminRevenue.analysisType.standard") : t("adminRevenue.analysisType.image"),
      value: Number(item.revenue) || 0,
      count: item.count,
    }));
  }, [revenueByType, t]);

  const totalRevenue = revenueStats?.totalRevenue || 0;
  const revenueFromTopUps = revenueStats?.revenueFromTopUps || 0;
  const revenueFromAnalysis = revenueStats?.revenueFromAnalysis || 0;
  const totalTopUps = revenueStats?.totalTopUps || 0;
  const totalAnalyses = revenueStats?.totalAnalyses || 0;

  const chartColors = [COLORS.RED, COLORS.BLUE, COLORS.SUCCESS, COLORS.WARNING];

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
              {t("adminRevenue.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminRevenue.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                // Export revenue data to CSV
                if (!revenueStats || !facilityRevenues || !revenueByType) {
                  alert(t("adminRevenue.exportError"));
                  return;
                }

                // Prepare CSV data
                const csvRows: string[] = [];
                
                // Header
                csvRows.push("Revenue Report Export");
                csvRows.push(`Generated: ${new Date().toLocaleString()}`);
                csvRows.push("");
                
                // Summary
                csvRows.push("Summary");
                csvRows.push("Metric,Value");
                csvRows.push(`Total Revenue,${(totalRevenue || 0).toFixed(2)}`);
                csvRows.push(`Revenue from Top-Ups,${(revenueFromTopUps || 0).toFixed(2)}`);
                csvRows.push(`Revenue from Analysis,${(revenueFromAnalysis || 0).toFixed(2)}`);
                csvRows.push(`Total Top-Ups,${totalTopUps || 0}`);
                csvRows.push(`Total Analyses,${totalAnalyses || 0}`);
                csvRows.push("");
                
                // Monthly Revenue
                if (revenueStats.revenueByMonth && revenueStats.revenueByMonth.length > 0) {
                  csvRows.push("Monthly Revenue");
                  csvRows.push("Month,Revenue");
                  revenueStats.revenueByMonth.forEach((item) => {
                    csvRows.push(`${item.month},${(Number(item.revenue) || 0).toFixed(2)}`);
                  });
                  csvRows.push("");
                }
                
                // Facility Revenue
                if (facilityRevenues.length > 0) {
                  csvRows.push("Revenue by Facility");
                  csvRows.push("Facility Name,Total Revenue,Top-Up Revenue,Analysis Revenue");
                  facilityRevenues.forEach((facility) => {
                    csvRows.push(`"${facility.facilityName}",${(Number(facility.totalRevenue) || 0).toFixed(2)},${(Number(facility.totalTopUpRevenue) || 0).toFixed(2)},${(Number(facility.totalAnalysisRevenue) || 0).toFixed(2)}`);
                  });
                  csvRows.push("");
                }
                
                // Revenue by Analysis Type
                if (revenueByType.length > 0) {
                  csvRows.push("Revenue by Analysis Type");
                  csvRows.push("Type,Revenue,Count");
                  revenueByType.forEach((item) => {
                    csvRows.push(`${item.analysisType},${(Number(item.revenue) || 0).toFixed(2)},${item.count || 0}`);
                  });
                }
                
                // Create and download CSV
                const csvContent = csvRows.join("\n");
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `revenue_report_${new Date().toISOString().split("T")[0]}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_500,
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
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
              <Download size={16} />
              {t("adminRevenue.export")}
            </button>
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
                  {t("adminRevenue.error.title")}
                </div>
                <div style={{ fontSize: "13px", color: COLORS.RED_DARK }}>
                  {(revenueError as any)?.message || t("adminRevenue.error.message")}
                </div>
              </div>
            </div>
            <button
              onClick={() => refetchRevenue()}
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
              {t("adminRevenue.error.retry")}
            </button>
          </div>
        )}

        {/* Revenue Overview Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <MetricCard
            icon={DollarSign}
            label={t("adminRevenue.metrics.totalRevenue")}
            value={`₵${totalRevenue.toFixed(2)}`}
            color={COLORS.SUCCESS}
            loading={isLoading}
            subtitle={t("adminRevenue.metrics.totalRevenueSubtitle", { count: totalTopUps })}
          />
          <MetricCard
            icon={CreditCard}
            label={t("adminRevenue.metrics.topUpRevenue")}
            value={`₵${revenueFromTopUps.toFixed(2)}`}
            color={COLORS.BLUE}
            loading={isLoading}
            subtitle={t("adminRevenue.metrics.topUpRevenueSubtitle", { count: totalTopUps })}
          />
          <MetricCard
            icon={Activity}
            label={t("adminRevenue.metrics.analysisRevenue")}
            value={`₵${revenueFromAnalysis.toFixed(2)}`}
            color={COLORS.RED}
            loading={isLoading}
            subtitle={t("adminRevenue.metrics.analysisRevenueSubtitle", { count: totalAnalyses })}
          />
          <MetricCard
            icon={TrendingUp}
            label={t("adminRevenue.metrics.avgTopUp")}
            value={`₵${totalTopUps > 0 ? (revenueFromTopUps / totalTopUps).toFixed(2) : "0.00"}`}
            color={COLORS.WARNING}
            loading={isLoading}
            subtitle={t("adminRevenue.metrics.avgTopUpSubtitle")}
          />
        </div>

        {/* Revenue Trends Chart */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            padding: "32px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                {t("adminRevenue.trends.title")}
              </h2>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                {t("adminRevenue.trends.subtitle")}
              </p>
            </div>
          </div>
          {monthlyRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                <XAxis dataKey="month" stroke={COLORS.GRAY_500} fontSize={12} />
                <YAxis stroke={COLORS.GRAY_500} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: COLORS.WHITE,
                    border: `1px solid ${COLORS.GRAY_200}`,
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`₵${value.toFixed(2)}`, t("adminRevenue.trends.revenueLabel")]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.RED}
                  strokeWidth={2}
                  name={t("adminRevenue.trends.revenueLabel")}
                  dot={{ fill: COLORS.RED, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: COLORS.GRAY_400 }}>
              {isLoading ? t("adminRevenue.loading") : t("adminRevenue.noData")}
            </div>
          )}
        </div>

        {/* Revenue Breakdown */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Revenue by Analysis Type */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              {t("adminRevenue.analysisType.title")}
            </h2>
            {analysisTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysisTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analysisTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`₵${Number(value).toFixed(2)}`, t("adminRevenue.trends.revenueLabel")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: COLORS.GRAY_400 }}>
                {isLoading ? t("adminRevenue.loadingShort") : t("adminRevenue.noData")}
              </div>
            )}
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {analysisTypeData.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: COLORS.GRAY_50,
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "2px",
                        background: chartColors[index % chartColors.length],
                      }}
                    />
                    <span style={{ fontSize: "14px", color: COLORS.GRAY_700 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      ₵{Number(item.value).toFixed(2)}
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>
                      {t("adminRevenue.analysisType.analysisCount", { count: item.count })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Facilities by Revenue */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
              {t("adminRevenue.topFacilities.title")}
            </h2>
            {topFacilitiesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topFacilitiesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis dataKey="name" stroke={COLORS.GRAY_500} fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke={COLORS.GRAY_500} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.WHITE,
                      border: `1px solid ${COLORS.GRAY_200}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`₵${value.toFixed(2)}`, t("adminRevenue.trends.revenueLabel")]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill={COLORS.RED} name={t("adminRevenue.topFacilities.totalRevenue")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: COLORS.GRAY_400 }}>
                {isLoading ? t("adminRevenue.loadingShort") : t("adminRevenue.noData")}
              </div>
            )}
          </div>
        </div>

        {/* Facilities Revenue Table */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("adminRevenue.table.title")}
            </h2>
          </div>
          {facilityRevenuesLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminRevenue.table.loading")}
            </div>
          ) : facilityRevenues && facilityRevenues.length > 0 ? (
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
                      {t("adminRevenue.table.facility")}
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
                      {t("adminRevenue.table.topUpRevenue")}
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
                      {t("adminRevenue.table.analysisRevenue")}
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
                      {t("adminRevenue.table.totalRevenue")}
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
                      {t("adminRevenue.table.transactions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facilityRevenues.map((facility, index) => (
                    <tr
                      key={facility.facilityId}
                      style={{
                        borderBottom: index < facilityRevenues.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none",
                      }}
                    >
                      <td style={{ padding: "16px 24px" }}>
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
                            <Building2 size={20} color={COLORS.RED} />
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                              {facility.facilityName}
                            </div>
                            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{facility.facilityEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.BLUE }}>
                          ₵{Number(facility.totalTopUpRevenue).toFixed(2)}
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>
                          {t("adminRevenue.table.topUpCount", { count: facility.topUpCount })}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.RED }}>
                          ₵{Number(facility.totalAnalysisRevenue).toFixed(2)}
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>
                          {t("adminRevenue.table.analysisCount", { count: facility.analysisCount })}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                          ₵{Number(facility.totalRevenue).toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_600 }}>
                          {t("adminRevenue.table.transactionsTotal", { count: facility.topUpCount + facility.analysisCount })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminRevenue.noData")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

