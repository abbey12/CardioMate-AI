import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getFacilityReferralCode, getFacilityReferralStats, type ReferralStats } from "../../lib/api";
import { Layout } from "../../components/layout/Layout";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  Gift,
  Copy,
  Share2,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { COLORS } from "../../ui/colors";
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

export function FacilityReferrals() {
  const { token, isFacility } = useAuth();
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: referralCode, isLoading: referralCodeLoading } = useQuery({
    queryKey: ["referralCode"],
    queryFn: () => getFacilityReferralCode(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
  });

  const { data: referralStats, isLoading: referralStatsLoading } = useQuery<ReferralStats>({
    queryKey: ["referralStats"],
    queryFn: () => getFacilityReferralStats(token!, handleTokenRefresh),
    enabled: !!token && isFacility,
  });

  if (!isFacility || !token) {
    return null;
  }

  const isLoading = referralCodeLoading || referralStatsLoading;

  // Prepare chart data for referrals over time
  const referralsByMonth = referralStats?.referrals.reduce((acc, referral) => {
    const month = new Date(referral.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (!acc[month]) {
      acc[month] = { month, count: 0, earnings: 0 };
    }
    acc[month].count += 1;
    acc[month].earnings += referral.bonusAmount;
    return acc;
  }, {} as Record<string, { month: string; count: number; earnings: number }>) || {};

  const chartData = Object.values(referralsByMonth).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  const handleCopyCode = () => {
    if (referralCode?.referralCode) {
      navigator.clipboard.writeText(referralCode.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (referralCode?.referralCode) {
      const shareText = `Join CardioMate AI using my referral code: ${referralCode.referralCode}. Get started with ECG analysis today!`;
      if (navigator.share) {
        navigator.share({
          title: "CardioMate AI Referral",
          text: shareText,
        }).catch(() => {
          // Fallback to copy
          navigator.clipboard.writeText(shareText);
          alert("Referral message copied to clipboard!");
        });
      } else {
        navigator.clipboard.writeText(shareText);
        alert("Referral message copied to clipboard!");
      }
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: "100%" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
            {t("facilityReferrals.title")}
          </h1>
          <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
            {t("facilityReferrals.subtitle")}
          </p>
        </div>

        {/* Referral Code Card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.RED_LIGHT} 0%, ${COLORS.BLUE_LIGHT} 100%)`,
            borderRadius: "16px",
            padding: "32px",
            border: `1px solid ${COLORS.GRAY_200}`,
            marginBottom: "32px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: `${COLORS.RED}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={28} color={COLORS.RED} />
                </div>
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                    {t("facilityReferrals.codeTitle")}
                  </h2>
                  <p style={{ fontSize: "14px", color: COLORS.GRAY_500, margin: 0 }}>
                    {t("facilityReferrals.codeSubtitle")}
                  </p>
                </div>
              </div>
              {isLoading ? (
                <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.GRAY_300 }}>
                  {t("facilityReferrals.loading")}
                </div>
              ) : referralCode?.referralCode ? (
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontSize: "36px",
                      fontWeight: "700",
                      color: COLORS.GRAY_800,
                      fontFamily: "monospace",
                      letterSpacing: "3px",
                      padding: "16px 24px",
                      background: COLORS.WHITE,
                      borderRadius: "12px",
                      border: `2px solid ${COLORS.RED}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    {referralCode.referralCode}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={handleCopyCode}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        background: copied ? COLORS.SUCCESS : COLORS.RED,
                        color: COLORS.WHITE,
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                      onMouseEnter={(e) => {
                        if (!copied) {
                          e.currentTarget.style.background = COLORS.RED_DARK;
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!copied) {
                          e.currentTarget.style.background = COLORS.RED;
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                        }
                      }}
                    >
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      {copied ? t("facilityReferrals.copied") : t("facilityReferrals.copy")}
                    </button>
                    <button
                      onClick={handleShare}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        background: COLORS.BLUE,
                        color: COLORS.WHITE,
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.BLUE_DARK;
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = COLORS.BLUE;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                      }}
                    >
                      <Share2 size={16} />
                      {t("facilityReferrals.share")}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "16px", color: COLORS.GRAY_400 }}>
                  {t("facilityReferrals.emptyCode")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
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
                  background: `${COLORS.BLUE}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={24} color={COLORS.BLUE} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                  {t("facilityReferrals.stats.totalReferrals")}
                </div>
                {isLoading ? (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
                ) : (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    {referralStats?.totalReferrals || 0}
                  </div>
                )}
              </div>
            </div>
          </div>

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
                  background: `${COLORS.SUCCESS}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Gift size={24} color={COLORS.SUCCESS} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                  {t("facilityReferrals.stats.totalEarnings")}
                </div>
                {isLoading ? (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
                ) : (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    ₵{referralStats?.totalReferralBonus.toFixed(2) || "0.00"}
                  </div>
                )}
              </div>
            </div>
          </div>

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
                  background: `${COLORS.RED}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp size={24} color={COLORS.RED} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                  {t("facilityReferrals.stats.thisMonth")}
                </div>
                {isLoading ? (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
                ) : (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    {referralStats?.referrals.filter(
                      (r) => new Date(r.createdAt).getMonth() === new Date().getMonth()
                    ).length || 0}
                  </div>
                )}
              </div>
            </div>
          </div>

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
                  background: `${COLORS.WARNING}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DollarSign size={24} color={COLORS.WARNING} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_500 }}>
                  {t("facilityReferrals.stats.avgPerReferral")}
                </div>
                {isLoading ? (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_300 }}>---</div>
                ) : (
                  <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                    ₵
                    {referralStats && referralStats.totalReferrals > 0
                      ? (referralStats.totalReferralBonus / referralStats.totalReferrals).toFixed(2)
                      : "0.00"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            {/* Referrals Over Time */}
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                border: `1px solid ${COLORS.GRAY_200}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
                Referrals Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis dataKey="month" stroke={COLORS.GRAY_500} fontSize={12} />
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
                    name="Referrals"
                    dot={{ fill: COLORS.RED, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Earnings Over Time */}
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                border: `1px solid ${COLORS.GRAY_200}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "24px" }}>
                Earnings Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_200} />
                  <XAxis dataKey="month" stroke={COLORS.GRAY_500} fontSize={12} />
                  <YAxis stroke={COLORS.GRAY_500} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.WHITE,
                      border: `1px solid ${COLORS.GRAY_200}`,
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`₵${value.toFixed(2)}`, "Earnings"]}
                  />
                  <Legend />
                  <Bar dataKey="earnings" fill={COLORS.BLUE} name="Earnings (GHS)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* All Referrals Table */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "24px", borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: 0 }}>
              {t("facilityReferrals.table.title")}
            </h2>
          </div>
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {t("facilityReferrals.table.loading")}
            </div>
          ) : referralStats && referralStats.referrals.length > 0 ? (
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
                      Facility
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
                      Signup Bonus
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
                      Your Bonus
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
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralStats.referrals.map((referral, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: index < referralStats.referrals.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none",
                      }}
                    >
                      <td style={{ padding: "16px 24px" }}>
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
                            <Building2 size={20} color={COLORS.BLUE} />
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                              {referral.referredFacilityName}
                            </div>
                            <div style={{ fontSize: "12px", color: COLORS.GRAY_500 }}>{referral.referredFacilityEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_600 }}>
                          ₵{referral.signupBonusAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_400 }}>
                          {t("facilityReferrals.table.theyReceived")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: COLORS.BLUE }}>
                          ₵{referral.bonusAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_400 }}>
                          {t("facilityReferrals.table.youEarned")}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ fontSize: "13px", color: COLORS.GRAY_600 }}>
                          {new Date(referral.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_400 }}>
                          {new Date(referral.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: COLORS.GRAY_100,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <UserPlus size={40} color={COLORS.GRAY_400} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, marginBottom: "8px" }}>
                No Referrals Yet
              </h3>
              <p style={{ fontSize: "14px", color: COLORS.GRAY_500, marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
                Start sharing your referral code to earn bonuses when facilities sign up using your code.
              </p>
              {referralCode?.referralCode && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 24px",
                    background: COLORS.RED,
                    color: COLORS.WHITE,
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: "600",
                    fontFamily: "monospace",
                    letterSpacing: "2px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={handleCopyCode}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.RED_DARK;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.RED;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {referralCode.referralCode}
                  <Copy size={18} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

