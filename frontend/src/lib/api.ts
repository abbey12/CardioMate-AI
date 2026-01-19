import type { EcgStructuredReport, PatientInfo } from "../ui/types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:4000";

// ==================== Auth API ====================

export type AdminSignupData = {
  email: string;
  password: string;
  name?: string;
};

export type FacilitySignupData = {
  name: string;
  email: string;
  password: string;
  referralCode?: string | null;
  country?: string | null;
};

export type LoginData = {
  email: string;
  password: string;
};

export type AuthResponse = {
  admin?: { id: string; email: string; name?: string };
  facility?: { id: string; name: string; email: string };
  accessToken: string;
  refreshToken: string;
};

export async function adminSignup(data: AdminSignupData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/admin/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Signup failed");
  return json;
}

export async function adminLogin(data: LoginData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Login failed");
  return json;
}

export async function facilitySignup(
  data: FacilitySignupData,
  token: string
): Promise<{ facility: { id: string; name: string; email: string } }> {
  const res = await fetch(`${API_BASE}/auth/facility/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Facility creation failed");
  return json;
}

export async function facilitySelfSignup(data: FacilitySignupData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/facility/signup-public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Facility signup failed");
  return json;
}

export async function facilityLogin(data: LoginData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/facility/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Login failed");
  return json;
}

// Unified login - tries both admin and facility
export async function unifiedLogin(data: LoginData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Login failed");
  return json;
}

export async function getDefaultLanguage(): Promise<{ language: "en" | "fr" }> {
  const res = await fetch(`${API_BASE}/auth/default-language`, {
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch default language");
  return json;
}

// Password Reset
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to request password reset");
  return json;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password: newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to reset password");
  return json;
}

// Change password (when logged in) - unified for admin and facility
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ success: boolean; message: string }> {
  const res = await authenticatedFetch(`${API_BASE}/auth/change-password`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to change password");
  return json;
}

// Legacy function - kept for backward compatibility, now uses unified endpoint
export async function changeFacilityPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ success: boolean; message: string }> {
  return changePassword(token, currentPassword, newPassword, onTokenRefresh);
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Token refresh failed");
  return json;
}

// ==================== Authenticated API Client ====================

function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}


// ==================== Admin API ====================

export type Facility = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalReports?: number;
  walletBalance?: number;
};

export type Patient = {
  id: string;
  facilityId: string;
  name: string;
  age?: number | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  dateOfBirth?: string | null;
  medicalRecordNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  primaryDiagnosis?: string | null;
  comorbidities?: string[] | null;
  medications?: string[] | null;
  allergies?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientWithStats = Patient & {
  totalEcgs: number;
  lastEcgDate?: string | null;
  firstEcgDate?: string | null;
};

export type CreatePatientData = {
  name: string;
  age?: number | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  dateOfBirth?: string | null;
  medicalRecordNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  primaryDiagnosis?: string | null;
  comorbidities?: string[] | null;
  medications?: string[] | null;
  allergies?: string[] | null;
};

export type UpdatePatientData = Partial<CreatePatientData>;

export type AdminAuditLog = {
  id: string;
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};

export type PaystackWebhookEvent = {
  id: string;
  eventType: string;
  reference?: string;
  status: "pending" | "processed" | "failed";
  attempts: number;
  payload: any;
  error?: string;
  processedAt?: string;
  createdAt: string;
};

export type OpsStatusSummary = {
  last24hErrors: number;
  last24hEmailErrors: number;
  last24hAiErrors: number;
  lastEventAt: string | null;
};

export type SystemEvent = {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error";
  message: string;
  context?: any;
  createdAt: string;
};

export type RetentionSettings = {
  retention: { days: number; enabled: boolean };
  anonymize: { days: number; enabled: boolean };
};

export async function getFacilities(token: string): Promise<Facility[]> {
  const res = await fetch(`${API_BASE}/admin/facilities`, {
    headers: getAuthHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch facilities");
  return json;
}

export async function getFacility(token: string, id: string): Promise<Facility> {
  const res = await fetch(`${API_BASE}/admin/facilities/${id}`, {
    headers: getAuthHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch facility");
  return json;
}

export async function getAdminFacilityDetails(
  token: string,
  facilityId: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<Facility & { totalReports: number; walletBalance: number }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/facilities/${facilityId}`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch facility details");
  return json;
}

export async function deleteFacility(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/facilities/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to delete facility");
}

export async function getAdminAuditLogs(
  token: string,
  limit: number = 50,
  offset: number = 0
): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  const res = await authenticatedFetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch audit logs");
  return json;
}

export async function getAdminTopUps(
  token: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ topUps: TopUp[]; total: number }> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  const res = await authenticatedFetch(`${API_BASE}/admin/topups?${params.toString()}`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch top-ups");
  return json;
}

export async function getPaystackWebhookEvents(
  token: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaystackWebhookEvent[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  if (status) params.append("status", status);
  const res = await authenticatedFetch(`${API_BASE}/admin/paystack/webhooks?${params.toString()}`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch webhook events");
  return json;
}

export async function retryPaystackWebhookEvent(
  token: string,
  eventId: string
): Promise<{ success: boolean }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/paystack/webhooks/${eventId}/retry`, {
    token,
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to retry webhook event");
  return json;
}

export async function getOpsStatus(token: string): Promise<OpsStatusSummary> {
  const res = await authenticatedFetch(`${API_BASE}/admin/ops/status`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch ops status");
  return json;
}

export async function getOpsEvents(
  token: string,
  type?: string,
  limit: number = 50,
  offset: number = 0
): Promise<SystemEvent[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  if (type) params.append("type", type);
  const res = await authenticatedFetch(`${API_BASE}/admin/ops/events?${params.toString()}`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch ops events");
  return json;
}

export async function getRetentionSettings(token: string): Promise<RetentionSettings> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/retention`, { token });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch retention settings");
  return json;
}

export async function updateRetentionSettings(
  token: string,
  data: {
    retentionDays: number;
    retentionEnabled: boolean;
    anonymizeAfterDays: number;
    anonymizeEnabled: boolean;
  }
): Promise<RetentionSettings> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/retention`, {
    token,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update retention settings");
  return json;
}

export async function getAdminLanguageSetting(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ language: "en" | "fr" }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/language`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch language settings");
  return json;
}

export async function updateAdminLanguageSetting(
  token: string,
  language: "en" | "fr",
  onTokenRefresh?: (newToken: string) => void
): Promise<{ language: "en" | "fr" }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/language`, {
    token,
    onTokenRefresh,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update language settings");
  return json;
}

export async function anonymizeReports(
  token: string,
  days: number
): Promise<{ success: boolean; anonymized: number }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/reports/anonymize`, {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to anonymize reports");
  return json;
}

export async function purgeReports(
  token: string,
  days: number
): Promise<{ success: boolean; purged: number }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/reports/purge`, {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to purge reports");
  return json;
}

export async function getAllReports(token: string): Promise<EcgStructuredReport[]> {
  const res = await fetch(`${API_BASE}/admin/reports`, {
    headers: getAuthHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch reports");
  return json;
}

// ==================== Admin Analytics ====================

export async function getAdminAnalyticsSummary(
  token: string,
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<AnalyticsSummary> {
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  const queryString = params.toString();
  const url = `${API_BASE}/admin/analytics/summary${queryString ? `?${queryString}` : ""}`;
  const res = await authenticatedFetch(url, { token, onTokenRefresh });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch analytics summary");
  return json;
}

export async function getAdminVolumeData(
  token: string,
  period: "daily" | "weekly" | "monthly",
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<VolumeDataPoint[]> {
  const params = new URLSearchParams();
  params.append("period", period);
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  const res = await authenticatedFetch(`${API_BASE}/admin/analytics/volume?${params.toString()}`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch volume data");
  return json;
}

export async function getAdminAbnormalityDistribution(
  token: string,
  fromDate?: string,
  toDate?: string,
  limit: number = 10,
  onTokenRefresh?: (newToken: string) => void
): Promise<AbnormalityDistribution[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  const res = await authenticatedFetch(`${API_BASE}/admin/analytics/abnormalities?${params.toString()}`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch abnormality distribution");
  return json;
}

export async function getAdminDemographicsData(
  token: string,
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<DemographicsData> {
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  const queryString = params.toString();
  const url = `${API_BASE}/admin/analytics/demographics${queryString ? `?${queryString}` : ""}`;
  const res = await authenticatedFetch(url, { token, onTokenRefresh });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch demographics data");
  return json;
}

export async function getAdminFacilityHealth(
  token: string,
  limit: number = 10,
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityHealthSummary[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  const res = await authenticatedFetch(`${API_BASE}/admin/analytics/facility-health?${params.toString()}`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch facility health data");
  return json;
}

export async function getAdminReport(
  token: string,
  id: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<EcgStructuredReport> {
  const res = await authenticatedFetch(`${API_BASE}/admin/reports/${id}`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch report");
  return json;
}

export type RevenueStats = {
  totalRevenue: number;
  revenueFromTopUps: number;
  revenueFromAnalysis: number;
  totalTopUps: number;
  totalAnalyses: number;
  currency: string;
  revenueByMonth: Array<{ month: string; revenue: number }>;
};

export type AdminStats = {
  totalFacilities: number;
  totalReports: number;
  revenue: RevenueStats;
  facilities: Facility[];
};

export type PricingConfig = {
  id: string;
  analysisType: "standard" | "image";
  pricePerAnalysis: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CountryPricing = {
  id: string;
  country: string;
  analysisType: "standard" | "image";
  pricePerAnalysis: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch stats");
  return json;
}

export async function getRevenueStats(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<RevenueStats> {
  const res = await authenticatedFetch(`${API_BASE}/admin/revenue`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch revenue stats");
  return json;
}

export async function getPricingConfig(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<PricingConfig[]> {
  const res = await authenticatedFetch(`${API_BASE}/admin/pricing`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch pricing");
  return json;
}

export async function updatePricing(
  token: string,
  analysisType: "standard" | "image",
  pricePerAnalysis: number,
  onTokenRefresh?: (newToken: string) => void
): Promise<PricingConfig> {
  const res = await authenticatedFetch(`${API_BASE}/admin/pricing`, {
    token,
    onTokenRefresh,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisType, pricePerAnalysis }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update pricing");
  return json;
}

// ==================== Country Pricing Management ====================

export async function getCountryPricing(
  token: string,
  country?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<CountryPricing[]> {
  const url = country 
    ? `${API_BASE}/admin/country-pricing?country=${encodeURIComponent(country)}`
    : `${API_BASE}/admin/country-pricing`;
  const res = await authenticatedFetch(url, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch country pricing");
  return json;
}

export async function setCountryPricing(
  token: string,
  country: string,
  analysisType: "standard" | "image",
  pricePerAnalysis: number,
  currency: string = "GHS",
  onTokenRefresh?: (newToken: string) => void
): Promise<CountryPricing> {
  const res = await authenticatedFetch(`${API_BASE}/admin/country-pricing`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country, analysisType, pricePerAnalysis, currency }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to set country pricing");
  return json;
}

export async function deleteCountryPricing(
  token: string,
  id: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<void> {
  const res = await authenticatedFetch(`${API_BASE}/admin/country-pricing/${id}`, {
    token,
    onTokenRefresh,
    method: "DELETE",
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json?.error ?? "Failed to delete country pricing");
  }
}

// ==================== Revenue Analytics ====================

export type FacilityRevenue = {
  facilityId: string;
  facilityName: string;
  facilityEmail: string;
  totalTopUpRevenue: number;
  totalAnalysisRevenue: number;
  totalRevenue: number;
  topUpCount: number;
  analysisCount: number;
};

export type RevenueByAnalysisType = {
  analysisType: "standard" | "image";
  revenue: number;
  count: number;
};

export async function getRevenueByFacility(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityRevenue[]> {
  const res = await authenticatedFetch(`${API_BASE}/admin/revenue/by-facility`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch revenue by facility");
  return json;
}

export async function getRevenueByAnalysisType(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<RevenueByAnalysisType[]> {
  const res = await authenticatedFetch(`${API_BASE}/admin/revenue/by-analysis-type`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch revenue by analysis type");
  return json;
}

// ==================== Platform Settings (Bonuses) ====================

export type BonusSettings = {
  signupBonus: { amount: number; currency: string; enabled: boolean };
  referralBonus: { amount: number; currency: string; enabled: boolean };
};

export async function getBonusSettings(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<BonusSettings> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/bonuses`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch bonus settings");
  return json;
}

export async function updateBonusSettings(
  token: string,
  type: "signup" | "referral",
  amount: number,
  enabled: boolean,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ amount: number; currency: string; enabled: boolean }> {
  const res = await authenticatedFetch(`${API_BASE}/admin/settings/bonuses`, {
    token,
    onTokenRefresh,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, amount, enabled }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update bonus settings");
  return json;
}

// ==================== Referral System ====================

export type ReferralStats = {
  referralCode: string;
  totalReferrals: number;
  totalReferralBonus: number;
  totalSignupBonuses: number;
  referrals: Array<{
    referredFacilityName: string;
    referredFacilityEmail: string;
    bonusAmount: number;
    signupBonusAmount: number;
    createdAt: string;
  }>;
};

export type AdminReferralStats = {
  totalReferrals: number;
  totalReferralBonuses: number;
  totalSignupBonuses: number;
  topReferringFacilities: Array<{
    facilityId: string;
    facilityName: string;
    referralCount: number;
    totalBonus: number;
  }>;
};

export async function getFacilityReferralCode(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ referralCode: string }> {
  const res = await authenticatedFetch(`${API_BASE}/facility/referral/code`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to get referral code");
  return json;
}

export async function getFacilityReferralStats(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<ReferralStats> {
  const res = await authenticatedFetch(`${API_BASE}/facility/referral/stats`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to get referral stats");
  return json;
}

// ==================== Patient Management API ====================

export async function getPatients(
  token: string,
  params?: { limit?: number; offset?: number; search?: string },
  onTokenRefresh?: (newToken: string) => void
): Promise<{ patients: Patient[]; total: number }> {
  const url = new URL(`${API_BASE}/facility/patients`);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  if (params?.search) url.searchParams.set("search", params.search);
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch patients");
  return json;
}

export async function searchPatients(
  token: string,
  query: string,
  limit?: number,
  onTokenRefresh?: (newToken: string) => void
): Promise<Patient[]> {
  const url = new URL(`${API_BASE}/facility/patients/search`);
  url.searchParams.set("q", query);
  if (limit) url.searchParams.set("limit", String(limit));
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to search patients");
  return json;
}

export async function getPatient(
  token: string,
  patientId: string,
  includeStats?: boolean,
  onTokenRefresh?: (newToken: string) => void
): Promise<Patient | PatientWithStats> {
  const url = new URL(`${API_BASE}/facility/patients/${patientId}`);
  if (includeStats) url.searchParams.set("stats", "true");
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch patient");
  return json;
}

export async function createPatient(
  token: string,
  data: CreatePatientData,
  onTokenRefresh?: (newToken: string) => void
): Promise<Patient> {
  const res = await authenticatedFetch(`${API_BASE}/facility/patients`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to create patient");
  return json;
}

export async function updatePatient(
  token: string,
  patientId: string,
  data: UpdatePatientData,
  onTokenRefresh?: (newToken: string) => void
): Promise<Patient> {
  const res = await authenticatedFetch(`${API_BASE}/facility/patients/${patientId}`, {
    token,
    onTokenRefresh,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update patient");
  return json;
}

export async function deletePatient(
  token: string,
  patientId: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<void> {
  const res = await authenticatedFetch(`${API_BASE}/facility/patients/${patientId}`, {
    token,
    onTokenRefresh,
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to delete patient");
}

export async function getPatientEcgs(
  token: string,
  patientId: string,
  params?: { limit?: number; offset?: number },
  onTokenRefresh?: (newToken: string) => void
): Promise<{ reports: EcgStructuredReport[]; total: number }> {
  const url = new URL(`${API_BASE}/facility/patients/${patientId}/ecgs`);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch patient ECGs");
  return json;
}

export async function getReportPriorEcgs(
  token: string,
  reportId: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ reports: EcgStructuredReport[]; total: number }> {
  const res = await authenticatedFetch(`${API_BASE}/facility/reports/${reportId}/prior-ecgs`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch prior ECGs");
  return json;
}

export async function getAdminReferralStats(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<AdminReferralStats> {
  const res = await authenticatedFetch(`${API_BASE}/admin/referrals/stats`, {
    token,
    onTokenRefresh,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to get referral stats");
  return json;
}

// ==================== Facility API ====================

export type FacilityDashboard = {
  totalReports: number;
  recentReports: Array<{
    id: string;
    createdAt: string;
    patientName?: string;
    heartRate?: number;
    rhythm?: string;
    abnormalities: number;
  }>;
};

// Helper to make authenticated requests with automatic token refresh
async function authenticatedFetch(
  url: string,
  options: RequestInit & { token: string; onTokenRefresh?: (newToken: string) => void }
): Promise<Response> {
  const { token, onTokenRefresh, ...fetchOptions } = options;
  
  let response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      ...getAuthHeaders(token),
    },
  });

  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const refreshResponse = await refreshAccessToken(refreshToken);
        const newToken = refreshResponse.accessToken;
        localStorage.setItem("accessToken", newToken);
        // Dispatch custom event to update auth context in same tab
        window.dispatchEvent(new CustomEvent("tokenRefresh", {
          detail: { key: "accessToken", newValue: newToken },
        }));
        if (onTokenRefresh) {
          onTokenRefresh(newToken);
        }
        // Retry with new token
        response = await fetch(url, {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            ...getAuthHeaders(newToken),
          },
        });
      } catch (error) {
        // Refresh failed, throw to trigger logout
        throw new Error("Session expired. Please login again.");
      }
    } else {
      throw new Error("Session expired. Please login again.");
    }
  }

  return response;
}

export async function getFacilityDashboard(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityDashboard> {
  const res = await authenticatedFetch(`${API_BASE}/facility/dashboard`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch dashboard");
  return json;
}

export type FacilityReportsResponse = {
  reports: EcgStructuredReport[];
  total: number;
  limit: number;
  offset: number;
};

export async function getFacilityReports(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
  },
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityReportsResponse> {
  const url = new URL(`${API_BASE}/facility/reports`);
  if (options?.limit) url.searchParams.set("limit", String(options.limit));
  if (options?.offset) url.searchParams.set("offset", String(options.offset));
  if (options?.fromDate) url.searchParams.set("fromDate", options.fromDate);
  if (options?.toDate) url.searchParams.set("toDate", options.toDate);
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch reports");
  return json;
}

export async function getFacilityReport(
  token: string,
  id: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<EcgStructuredReport> {
  const res = await authenticatedFetch(`${API_BASE}/facility/reports/${id}`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch report");
  return json;
}

export async function uploadEcg(
  token: string,
  opts: {
    file: File;
    sampleRateHz?: number;
    patient?: PatientInfo;
    patientId?: string;
  },
  onTokenRefresh?: (newToken: string) => void
): Promise<EcgStructuredReport> {
  const fd = new FormData();
  fd.append("file", opts.file);
  if (opts.patientId) {
    fd.append("patientId", opts.patientId);
  } else if (opts.patient) {
    fd.append("patient", JSON.stringify(opts.patient));
  }

  const url = new URL(`${API_BASE}/facility/reports/upload`);
  if (opts.sampleRateHz) url.searchParams.set("sampleRateHz", String(opts.sampleRateHz));

  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json?.error ?? `Upload failed (${res.status})`);
    error.status = res.status;
    error.response = { json: async () => json };
    throw error;
  }
  return json;
}

export async function downloadReportPdf(
  token: string,
  id: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<void> {
  const res = await authenticatedFetch(`${API_BASE}/facility/reports/${id}/download`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `ECG_Report_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function downloadAdminReportPdf(
  token: string,
  id: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<void> {
  const res = await authenticatedFetch(`${API_BASE}/admin/reports/${id}/download`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `ECG_Report_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function exportReportsCsv(
  token: string,
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<void> {
  const url = new URL(`${API_BASE}/facility/reports/export/csv`);
  if (fromDate) url.searchParams.set("fromDate", fromDate);
  if (toDate) url.searchParams.set("toDate", toDate);
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
    method: "GET",
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `ECG_Reports_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export type FacilityProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  facilityType?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  preferredLanguage?: string | null;
  signupCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getFacilityProfile(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityProfile> {
  const res = await authenticatedFetch(`${API_BASE}/facility/profile`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch profile");
  return json.facility;
}

export async function updateFacilityProfile(
  token: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    facilityType?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    website?: string | null;
  },
  onTokenRefresh?: (newToken: string) => void
): Promise<FacilityProfile> {
  const res = await authenticatedFetch(`${API_BASE}/facility/profile`, {
    token,
    onTokenRefresh,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to update profile");
  return json.facility;
}

// ==================== Analytics ====================

export type AnalyticsSummary = {
  totalReports: number;
  totalAbnormalities: number;
  normalReports: number;
  abnormalReports: number;
  averageAge: number | null;
  maleCount: number;
  femaleCount: number;
  averageHeartRate: number | null;
  mostCommonAbnormality: string | null;
  reportsLast7Days: number;
  reportsLast30Days: number;
};

export type VolumeDataPoint = {
  date: string;
  count: number;
};

export type AbnormalityDistribution = {
  abnormality: string;
  count: number;
  percentage: number;
};

export type DemographicsData = {
  ageGroups: Array<{ range: string; count: number }>;
  sexDistribution: Array<{ sex: string; count: number; percentage: number }>;
};

export type FacilityHealthSummary = {
  facilityId: string;
  facilityName: string;
  facilityEmail: string;
  totalReports: number;
  abnormalReports: number;
  abnormalRate: number;
  analysisRevenue: number;
  lastReportAt: string | null;
};

export async function getAnalyticsSummary(
  token: string,
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<AnalyticsSummary> {
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  
  const url = `${API_BASE}/facility/analytics/summary${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
    token,
    onTokenRefresh,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch analytics summary" }));
    throw new Error(error.error || "Failed to fetch analytics summary");
  }
  
  return response.json();
}

export async function getVolumeData(
  token: string,
  period: "daily" | "weekly" | "monthly" = "daily",
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<VolumeDataPoint[]> {
  const params = new URLSearchParams();
  params.append("period", period);
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  
  const url = `${API_BASE}/facility/analytics/volume?${params.toString()}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
    token,
    onTokenRefresh,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch volume data" }));
    throw new Error(error.error || "Failed to fetch volume data");
  }
  
  return response.json();
}

export async function getAbnormalityDistribution(
  token: string,
  fromDate?: string,
  toDate?: string,
  limit: number = 10,
  onTokenRefresh?: (newToken: string) => void
): Promise<AbnormalityDistribution[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  
  const url = `${API_BASE}/facility/analytics/abnormalities?${params.toString()}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
    token,
    onTokenRefresh,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch abnormality distribution" }));
    throw new Error(error.error || "Failed to fetch abnormality distribution");
  }
  
  return response.json();
}

export async function getDemographicsData(
  token: string,
  fromDate?: string,
  toDate?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<DemographicsData> {
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);
  
  const url = `${API_BASE}/facility/analytics/demographics${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await authenticatedFetch(url, {
    method: "GET",
    token,
    onTokenRefresh,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch demographics data" }));
    throw new Error(error.error || "Failed to fetch demographics data");
  }
  
  return response.json();
}

// ==================== Wallet API ====================

export type Wallet = {
  balance: number;
  currency: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  facilityId: string;
  type: "topup" | "deduction" | "refund" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  metadata?: any;
  createdAt: string;
};

export type WalletTransactionsResponse = {
  transactions: WalletTransaction[];
  total: number;
};

export type Pricing = {
  standard: number;
  image: number;
  currency: string;
};

export async function getFacilityWallet(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<Wallet> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch wallet");
  return json;
}

export async function getWalletTransactions(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
  },
  onTokenRefresh?: (newToken: string) => void
): Promise<WalletTransactionsResponse> {
  const url = new URL(`${API_BASE}/facility/wallet/transactions`);
  if (options?.limit) url.searchParams.set("limit", String(options.limit));
  if (options?.offset) url.searchParams.set("offset", String(options.offset));
  if (options?.fromDate) url.searchParams.set("fromDate", options.fromDate);
  if (options?.toDate) url.searchParams.set("toDate", options.toDate);
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch transactions");
  return json;
}

export async function getPricing(
  token: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<Pricing> {
  const res = await authenticatedFetch(`${API_BASE}/facility/pricing`, {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch pricing");
  return json;
}

export type TopUp = {
  id: string;
  facilityId: string;
  amountRequested: number;
  amountReceived: number | null;
  status: "pending" | "verified" | "failed" | "cancelled";
  paystackReference: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
};

export type TopUpsResponse = {
  topUps: TopUp[];
  total: number;
};

// Initialize Paystack top-up
export async function initializePaystackTopUp(
  token: string,
  amount: number,
  onTokenRefresh?: (newToken: string) => void
): Promise<{
  success: boolean;
  authorizationUrl: string;
  reference: string;
  topUpId: string;
}> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet/topup/initialize`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to initialize payment");
  return json;
}

// Verify Paystack top-up (manual verification - webhook is preferred)
export async function verifyPaystackTopUp(
  token: string,
  reference: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{
  success: boolean;
  topUp: TopUp;
  newBalance: number;
}> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet/topup/verify`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reference }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to verify payment");
  return json;
}

// Get top-up history
export async function getFacilityTopUps(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
  },
  onTokenRefresh?: (newToken: string) => void
): Promise<TopUpsResponse> {
  const url = new URL(`${API_BASE}/facility/wallet/topups`);
  if (options?.limit) url.searchParams.set("limit", String(options.limit));
  if (options?.offset) url.searchParams.set("offset", String(options.offset));
  
  const res = await authenticatedFetch(url.toString(), {
    token,
    onTokenRefresh,
    method: "GET",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch top-ups");
  return json;
}

// Cancel pending top-up
export async function cancelTopUp(
  token: string,
  topUpId: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ success: boolean; message: string }> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet/topups/${topUpId}`, {
    token,
    onTokenRefresh,
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to cancel top-up");
  return json;
}

// Retry payment for pending top-up
export async function retryTopUpPayment(
  token: string,
  topUpId: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{
  success: boolean;
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  topUpId: string;
}> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet/topups/${topUpId}/retry`, {
    token,
    onTokenRefresh,
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to retry payment");
  return json;
}

// Manual top-up (kept for backward compatibility/admin use)
export async function topUpWallet(
  token: string,
  amount: number,
  description?: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{ success: boolean; transaction: WalletTransaction; newBalance: number }> {
  const res = await authenticatedFetch(`${API_BASE}/facility/wallet/topup/manual`, {
    token,
    onTokenRefresh,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, description }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to top up wallet");
  return json;
}

