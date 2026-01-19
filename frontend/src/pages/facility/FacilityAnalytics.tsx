import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getAnalyticsSummary,
  getVolumeData,
  getAbnormalityDistribution,
  getDemographicsData,
  type AnalyticsSummary,
  type VolumeDataPoint,
  type AbnormalityDistribution,
  type DemographicsData,
} from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import { useTranslation } from "react-i18next";
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
import {
  Activity,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Heart,
  FileText,
  Download,
  Filter,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Cardiology color scheme: Red, Blue, White
const COLORS = ["#dc2626", "#2563eb", "#ffffff", "#b91c1c", "#1d4ed8", "#fef2f2", "#eff6ff", "#64748b"];

export function FacilityAnalytics() {
  const { token, isFacility, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [compareMode, setCompareMode] = useState(false);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["analyticsSummary", fromDate, toDate],
    queryFn: () => getAnalyticsSummary(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh),
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

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeDataPoint[]>({
    queryKey: ["volumeData", period, fromDate, toDate],
    queryFn: () => getVolumeData(token!, period, fromDate || undefined, toDate || undefined, handleTokenRefresh),
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

  const { data: abnormalities, isLoading: abnormalitiesLoading } = useQuery<AbnormalityDistribution[]>({
    queryKey: ["abnormalities", fromDate, toDate],
    queryFn: () => getAbnormalityDistribution(token!, fromDate || undefined, toDate || undefined, 10, handleTokenRefresh),
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

  const { data: demographics, isLoading: demographicsLoading } = useQuery<DemographicsData>({
    queryKey: ["demographics", fromDate, toDate],
    queryFn: () => getDemographicsData(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh),
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

  if (!isFacility || !token) {
    return null;
  }

  const isLoading = summaryLoading || volumeLoading || abnormalitiesLoading || demographicsLoading;

  return (
    <Layout>
      <div>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
            {t("facilityAnalytics.title")}
          </h1>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
            {t("facilityAnalytics.subtitle")}
          </p>
        </div>

        {/* Date Range Filter */}
        <div
          style={{
            marginBottom: "32px",
            padding: "20px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
              <Filter size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
              {t("facilityAnalytics.filters.title")}
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const today = new Date();
                  const last7Days = new Date(today);
                  last7Days.setDate(today.getDate() - 7);
                  setFromDate(last7Days.toISOString().split("T")[0]);
                  setToDate(today.toISOString().split("T")[0]);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {t("facilityAnalytics.filters.last7Days")}
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const last30Days = new Date(today);
                  last30Days.setDate(today.getDate() - 30);
                  setFromDate(last30Days.toISOString().split("T")[0]);
                  setToDate(today.toISOString().split("T")[0]);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {t("facilityAnalytics.filters.last30Days")}
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const last90Days = new Date(today);
                  last90Days.setDate(today.getDate() - 90);
                  setFromDate(last90Days.toISOString().split("T")[0]);
                  setToDate(today.toISOString().split("T")[0]);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {t("facilityAnalytics.filters.last90Days")}
              </button>
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                style={{
                  padding: "6px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </div>
            <div style={{ minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                {t("facilityAnalytics.filters.period")}
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  background: "#ffffff",
                }}
              >
                <option value="daily">{t("facilityAnalytics.filters.daily")}</option>
                <option value="weekly">{t("facilityAnalytics.filters.weekly")}</option>
                <option value="monthly">{t("facilityAnalytics.filters.monthly")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            {t("facilityAnalytics.loading")}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              <MetricCard
                icon={FileText}
                label={t("facilityAnalytics.cards.totalReports")}
                value={summary?.totalReports || 0}
                color="#dc2626"
                trend={summary?.reportsLast7Days !== undefined ? {
                  current: summary.reportsLast7Days,
                  previous: summary.reportsLast30Days - summary.reportsLast7Days,
                  period: t("facilityAnalytics.cards.trend7Days")
                } : undefined}
              />
              <MetricCard
                icon={AlertTriangle}
                label={t("facilityAnalytics.cards.abnormalReports")}
                value={summary?.abnormalReports || 0}
                color="#dc2626"
                subtitle={t("facilityAnalytics.cards.percentOfTotal", {
                  percent: summary?.totalReports
                    ? Math.round((summary.abnormalReports / summary.totalReports) * 100)
                    : 0,
                })}
              />
              <MetricCard
                icon={Activity}
                label={t("facilityAnalytics.cards.normalReports")}
                value={summary?.normalReports || 0}
                color="#16a34a"
                subtitle={t("facilityAnalytics.cards.percentOfTotal", {
                  percent: summary?.totalReports
                    ? Math.round((summary.normalReports / summary.totalReports) * 100)
                    : 0,
                })}
              />
              <MetricCard
                icon={Users}
                label={t("facilityAnalytics.cards.averageAge")}
                value={
                  summary?.averageAge
                    ? t("facilityAnalytics.cards.yearsValue", { value: Math.round(summary.averageAge) })
                    : t("facilityAnalytics.cards.na")
                }
                color="#8b5cf6"
              />
              <MetricCard
                icon={Heart}
                label={t("facilityAnalytics.cards.avgHeartRate")}
                value={
                  summary?.averageHeartRate
                    ? t("facilityAnalytics.cards.bpmValue", { value: Math.round(summary.averageHeartRate) })
                    : t("facilityAnalytics.cards.na")
                }
                color="#f59e0b"
              />
              <MetricCard
                icon={TrendingUp}
                label={t("facilityAnalytics.cards.last7Days")}
                value={summary?.reportsLast7Days || 0}
                color="#06b6d4"
                trend={summary?.reportsLast7Days !== undefined && summary?.reportsLast30Days !== undefined ? {
                  current: summary.reportsLast7Days,
                  previous: Math.round((summary.reportsLast30Days - summary.reportsLast7Days) / 3),
                  period: t("facilityAnalytics.cards.trendAvg23Days")
                } : undefined}
              />
            </div>

            {/* Charts Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
              {/* Report Volume Chart */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 20px 0" }}>
                  {t("facilityAnalytics.charts.volume")}
                </h3>
                {volumeData && volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#dc2626"
                        strokeWidth={2}
                        name={t("facilityAnalytics.charts.reports")}
                        dot={{ fill: "#dc2626", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    {t("facilityAnalytics.noData")}
                  </div>
                )}
              </div>

              {/* Abnormalities Distribution Chart */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 20px 0" }}>
                  {t("facilityAnalytics.charts.abnormalities")}
                </h3>
                {abnormalities && abnormalities.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={abnormalities}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="abnormality"
                        stroke="#64748b"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#dc2626" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    {t("facilityAnalytics.empty.abnormalities")}
                  </div>
                )}
              </div>
            </div>

            {/* Demographics Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
              {/* Age Distribution */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 20px 0" }}>
                  {t("facilityAnalytics.charts.ageDistribution")}
                </h3>
                {demographics?.ageGroups && demographics.ageGroups.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={demographics.ageGroups}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" name="Patients" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    {t("facilityAnalytics.empty.age")}
                  </div>
                )}
              </div>

              {/* Sex Distribution */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 20px 0" }}>
                  {t("facilityAnalytics.charts.sexDistribution")}
                </h3>
                {demographics?.sexDistribution && demographics.sexDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={demographics.sexDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.sex}: ${entry.percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {demographics.sexDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    {t("facilityAnalytics.empty.sex")}
                  </div>
                )}
              </div>
            </div>

            {/* Most Common Abnormality */}
            {summary?.mostCommonAbnormality && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  marginBottom: "32px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "0 0 12px 0" }}>
                  Most Common Abnormality
                </h3>
                <p style={{ fontSize: "16px", color: "#374151", margin: 0 }}>{summary.mostCommonAbnormality}</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
  trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
  trend?: { current: number; previous: number; period: string };
}) {
  const trendPercentage = trend
    ? trend.previous > 0
      ? Math.round(((trend.current - trend.previous) / trend.previous) * 100)
      : trend.current > 0
      ? 100
      : 0
    : null;
  const isPositiveTrend = trendPercentage !== null && trendPercentage > 0;
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500", marginBottom: "4px" }}>
            {label}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>{value}</div>
          {subtitle && (
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{subtitle}</div>
          )}
          {trend && trendPercentage !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "12px" }}>
              {isPositiveTrend ? (
                <ArrowUpRight size={14} color="#16a34a" />
              ) : (
                <ArrowDownRight size={14} color="#dc2626" />
              )}
              <span style={{ color: isPositiveTrend ? "#16a34a" : "#dc2626", fontWeight: "600" }}>
                {Math.abs(trendPercentage)}%
              </span>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>{trend.period}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

