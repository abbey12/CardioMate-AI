import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminStats,
  getAdminAnalyticsSummary,
  getAdminVolumeData,
  getAdminAbnormalityDistribution,
  getAdminDemographicsData,
  getAdminFacilityHealth,
  type AnalyticsSummary,
  type VolumeDataPoint,
  type AbnormalityDistribution,
  type DemographicsData,
  type FacilityHealthSummary,
} from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
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
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Heart,
  AlertTriangle,
  Activity,
  Filter,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

const chartColors = [COLORS.RED, COLORS.BLUE, COLORS.GRAY_500, "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  loading: boolean;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: COLORS.WHITE,
        borderRadius: "16px",
        padding: "24px",
        border: `1px solid ${COLORS.GRAY_200}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
          <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "4px" }}>{label}</div>
          {loading ? (
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
          ) : (
            <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{value}</div>
          )}
          {subtitle && !loading && (
            <div style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "4px" }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => getAdminStats(token!),
    enabled: !!token && isAdmin,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["adminAnalyticsSummary", fromDate, toDate],
    queryFn: () => getAdminAnalyticsSummary(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery<VolumeDataPoint[]>({
    queryKey: ["adminVolumeData", period, fromDate, toDate],
    queryFn: () => getAdminVolumeData(token!, period, fromDate || undefined, toDate || undefined, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: abnormalities, isLoading: abnormalitiesLoading } = useQuery<AbnormalityDistribution[]>({
    queryKey: ["adminAbnormalities", fromDate, toDate],
    queryFn: () => getAdminAbnormalityDistribution(token!, fromDate || undefined, toDate || undefined, 10, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: demographics, isLoading: demographicsLoading } = useQuery<DemographicsData>({
    queryKey: ["adminDemographics", fromDate, toDate],
    queryFn: () => getAdminDemographicsData(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const { data: facilityHealth, isLoading: facilityHealthLoading } = useQuery<FacilityHealthSummary[]>({
    queryKey: ["adminFacilityHealth", 10],
    queryFn: () => getAdminFacilityHealth(token!, 10, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  if (!isAdmin || !token) {
    return null;
  }

  const isLoading = statsLoading || summaryLoading || volumeLoading || abnormalitiesLoading || demographicsLoading || facilityHealthLoading;

  const totalFacilities = stats?.totalFacilities || 0;
  const totalReports = stats?.totalReports || 0;
  const normalReports = summary?.normalReports || 0;
  const abnormalReports = summary?.abnormalReports || 0;
  const abnormalityRate = totalReports > 0 ? Math.round((abnormalReports / Math.max(totalReports, 1)) * 100) : 0;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
              {t("adminAnalytics.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminAnalytics.subtitle")}
            </p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            padding: "24px",
            border: `1px solid ${COLORS.GRAY_200}`,
            marginBottom: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <Filter size={20} color={COLORS.GRAY_500} />
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("adminAnalytics.filters.title")}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                {t("adminAnalytics.filters.fromDate")}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: COLORS.WHITE,
                  color: COLORS.GRAY_800,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                {t("adminAnalytics.filters.toDate")}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: COLORS.WHITE,
                  color: COLORS.GRAY_800,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700, marginBottom: "8px" }}>
                {t("adminAnalytics.filters.period")}
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.GRAY_200}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: COLORS.WHITE,
                  color: COLORS.GRAY_800,
                  cursor: "pointer",
                }}
              >
                <option value="daily">{t("adminAnalytics.filters.daily")}</option>
                <option value="weekly">{t("adminAnalytics.filters.weekly")}</option>
                <option value="monthly">{t("adminAnalytics.filters.monthly")}</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setPeriod("daily");
                }}
                style={{
                  padding: "10px 20px",
                  background: COLORS.GRAY_100,
                  color: COLORS.GRAY_700,
                  border: `1px solid ${COLORS.GRAY_200}`,
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.GRAY_200;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = COLORS.GRAY_100;
                }}
              >
                {t("adminAnalytics.filters.clear")}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          <MetricCard
            icon={Users}
            label={t("adminAnalytics.metrics.totalFacilities")}
            value={totalFacilities}
            color={COLORS.RED}
            loading={isLoading}
          />
          <MetricCard
            icon={FileText}
            label={t("adminAnalytics.metrics.totalReports")}
            value={totalReports}
            color={COLORS.BLUE}
            loading={isLoading}
            subtitle={summary?.reportsLast30Days ? t("adminAnalytics.metrics.reportsLast30Days", { count: summary.reportsLast30Days }) : undefined}
          />
          <MetricCard
            icon={CheckCircle2}
            label={t("adminAnalytics.metrics.normalReports")}
            value={normalReports}
            color={COLORS.SUCCESS}
            loading={isLoading}
            subtitle={totalReports > 0 ? t("adminAnalytics.metrics.percentOfTotal", { percent: Math.round((normalReports / Math.max(totalReports, 1)) * 100) }) : undefined}
          />
          <MetricCard
            icon={AlertTriangle}
            label={t("adminAnalytics.metrics.abnormalReports")}
            value={abnormalReports}
            color={COLORS.RED}
            loading={isLoading}
            subtitle={totalReports > 0 ? t("adminAnalytics.metrics.abnormalityRate", { percent: abnormalityRate }) : undefined}
          />
          <MetricCard
            icon={Heart}
            label={t("adminAnalytics.metrics.avgHeartRate")}
            value={summary?.averageHeartRate ? t("adminAnalytics.metrics.avgHeartRateValue", { value: Math.round(summary.averageHeartRate) }) : t("adminAnalytics.metrics.na")}
            color={COLORS.RED}
            loading={isLoading}
          />
          <MetricCard
            icon={Users}
            label={t("adminAnalytics.metrics.avgAge")}
            value={summary?.averageAge ? t("adminAnalytics.metrics.avgAgeValue", { value: Math.round(summary.averageAge) }) : t("adminAnalytics.metrics.na")}
            color={COLORS.BLUE}
            loading={isLoading}
          />
        </div>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          {/* Report Volume Chart */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                  {t("adminAnalytics.reportVolume.title")}
                </h2>
                <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                  {t("adminAnalytics.reportVolume.subtitle", {
                    period: period === "daily" ? t("adminAnalytics.filters.daily") : period === "weekly" ? t("adminAnalytics.filters.weekly") : t("adminAnalytics.filters.monthly"),
                  })}
                </p>
              </div>
              <Calendar size={20} color={COLORS.GRAY_400} />
            </div>
            {volumeLoading ? (
              <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                {t("adminAnalytics.chart.loading")}
              </div>
            ) : volumeData && volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis dataKey="date" stroke={COLORS.GRAY_500} fontSize={12} />
                  <YAxis stroke={COLORS.GRAY_500} fontSize={12} />
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
                    name={t("adminAnalytics.reportVolume.legend")}
                    dot={{ fill: COLORS.RED, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                {t("adminAnalytics.chart.noData")}
              </div>
            )}
          </div>

          {/* Abnormality Distribution Chart */}
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "16px",
              padding: "32px",
              border: `1px solid ${COLORS.GRAY_200}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                  {t("adminAnalytics.abnormalities.title")}
                </h2>
                <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                  {t("adminAnalytics.abnormalities.subtitle")}
                </p>
              </div>
              <AlertTriangle size={20} color={COLORS.RED} />
            </div>
            {abnormalitiesLoading ? (
              <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                {t("adminAnalytics.chart.loading")}
              </div>
            ) : abnormalities && abnormalities.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={abnormalities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis type="number" stroke={COLORS.GRAY_500} fontSize={12} />
                  <YAxis dataKey="abnormality" type="category" stroke={COLORS.GRAY_500} fontSize={12} width={150} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.WHITE,
                      border: `1px solid ${COLORS.GRAY_200}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage}%)`,
                      t("adminAnalytics.abnormalities.countLabel"),
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="count" fill={COLORS.RED} name={t("adminAnalytics.abnormalities.countLabel")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                {t("adminAnalytics.abnormalities.noData")}
              </div>
            )}
          </div>
        </div>

        {/* Demographics Charts */}
        {demographics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            {/* Sex Distribution */}
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                border: `1px solid ${COLORS.GRAY_200}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                    {t("adminAnalytics.demographics.sexDistribution.title")}
                  </h2>
                  <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                    {t("adminAnalytics.demographics.sexDistribution.subtitle")}
                  </p>
                </div>
                <Users size={20} color={COLORS.BLUE} />
              </div>
              {demographicsLoading ? (
                <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                  {t("adminAnalytics.chart.loading")}
                </div>
              ) : demographics.sexDistribution && demographics.sexDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demographics.sexDistribution}
                      dataKey="count"
                      nameKey="sex"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ sex, percentage }) => `${sex}: ${percentage}%`}
                    >
                      {demographics.sexDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: COLORS.WHITE,
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} (${props.payload.percentage}%)`,
                        props.payload.sex,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_400 }}>
                  {t("adminAnalytics.demographics.noData")}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                border: `1px solid ${COLORS.GRAY_200}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 24px 0" }}>
                {t("adminAnalytics.insights.title")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {summary?.mostCommonAbnormality && (
                  <div>
                    <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "8px" }}>
                      {t("adminAnalytics.insights.mostCommonAbnormality")}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {summary.mostCommonAbnormality}
                    </div>
                  </div>
                )}
                {demographics.averageAge && (
                  <div>
                    <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "8px" }}>
                      {t("adminAnalytics.insights.averagePatientAge")}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {t("adminAnalytics.metrics.avgAgeValue", { value: Math.round(demographics.averageAge) })}
                    </div>
                  </div>
                )}
                {summary?.reportsLast7Days !== undefined && (
                  <div>
                    <div style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "8px" }}>
                      {t("adminAnalytics.insights.reportsLast7Days")}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                      {summary.reportsLast7Days}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Facility Leaderboard & Health */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          <div style={{ padding: "24px", borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
              {t("adminAnalytics.facilityHealth.title")}
            </h2>
            <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminAnalytics.facilityHealth.subtitle")}
            </p>
          </div>
          {facilityHealthLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminAnalytics.facilityHealth.loading")}
            </div>
          ) : facilityHealth && facilityHealth.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50 }}>
                    <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAnalytics.facilityHealth.table.facility")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAnalytics.facilityHealth.table.reports")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAnalytics.facilityHealth.table.abnormalRate")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAnalytics.facilityHealth.table.revenue")}
                    </th>
                    <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: COLORS.GRAY_500, textTransform: "uppercase" }}>
                      {t("adminAnalytics.facilityHealth.table.lastActivity")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facilityHealth.map((facility, index) => (
                    <tr key={facility.facilityId} style={{ borderBottom: index < facilityHealth.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>{facility.facilityName}</div>
                          <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{facility.facilityEmail}</div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>{facility.totalReports}</div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: facility.abnormalRate > 40 ? COLORS.RED : COLORS.BLUE }}>
                          {facility.abnormalRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>
                          {t("adminAnalytics.facilityHealth.abnormalCount", { count: facility.abnormalReports })}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_800 }}>
                          ₵{facility.analysisRevenue.toFixed(2)}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "13px", color: COLORS.GRAY_600 }}>
                          {facility.lastReportAt ? new Date(facility.lastReportAt).toLocaleDateString() : t("adminAnalytics.metrics.na")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("adminAnalytics.facilityHealth.noData")}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
