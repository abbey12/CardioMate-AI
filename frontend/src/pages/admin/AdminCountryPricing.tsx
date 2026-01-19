import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCountryPricing,
  setCountryPricing,
  deleteCountryPricing,
  type CountryPricing,
} from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { useTranslation } from "react-i18next";
import { AFRICAN_COUNTRIES } from "../../ui/africanCountries";
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { COLORS } from "../../ui/colors";

export function AdminCountryPricing() {
  const { token, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CountryPricing | null>(null);
  const [formData, setFormData] = useState({
    country: "",
    analysisType: "standard" as "standard" | "image",
    pricePerAnalysis: "",
    currency: "GHS",
  });

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: countryPricing, isLoading, error, refetch } = useQuery<CountryPricing[]>({
    queryKey: ["countryPricing"],
    queryFn: () => getCountryPricing(token!, undefined, handleTokenRefresh),
    enabled: !!token && isAdmin,
  });

  const setPricingMutation = useMutation({
    mutationFn: (data: {
      country: string;
      analysisType: "standard" | "image";
      pricePerAnalysis: number;
      currency: string;
    }) => setCountryPricing(token!, data.country, data.analysisType, data.pricePerAnalysis, data.currency, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countryPricing"] });
      setShowAddModal(false);
      setEditingPricing(null);
      setFormData({
        country: "",
        analysisType: "standard",
        pricePerAnalysis: "",
        currency: "GHS",
      });
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to set country pricing");
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: (id: string) => deleteCountryPricing(token!, id, handleTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countryPricing"] });
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to delete country pricing");
    },
  });

  const handleOpenAddModal = () => {
    setFormData({
      country: "",
      analysisType: "standard",
      pricePerAnalysis: "",
      currency: "GHS",
    });
    setEditingPricing(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (pricing: CountryPricing) => {
    setFormData({
      country: pricing.country,
      analysisType: pricing.analysisType,
      pricePerAnalysis: pricing.pricePerAnalysis.toString(),
      currency: pricing.currency,
    });
    setEditingPricing(pricing);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.pricePerAnalysis);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      return;
    }
    setPricingMutation.mutate({
      country: formData.country,
      analysisType: formData.analysisType,
      pricePerAnalysis: price,
      currency: formData.currency,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this country pricing?")) {
      deletePricingMutation.mutate(id);
    }
  };

  // Group pricing by country
  const pricingByCountry = countryPricing?.reduce((acc, pricing) => {
    if (!acc[pricing.country]) {
      acc[pricing.country] = { standard: null, image: null };
    }
    if (pricing.analysisType === "standard") {
      acc[pricing.country].standard = pricing;
    } else {
      acc[pricing.country].image = pricing;
    }
    return acc;
  }, {} as Record<string, { standard: CountryPricing | null; image: CountryPricing | null }>) || {};

  // Filter countries based on search
  const filteredCountries = AFRICAN_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get countries with pricing configured
  const countriesWithPricing = Object.keys(pricingByCountry);

  return (
    <AdminLayout>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: COLORS.GRAY_800, margin: "0 0 8px 0" }}>
                {t("adminCountryPricing.title", "Country Pricing Management")}
              </h1>
              <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
                {t("adminCountryPricing.subtitle", "Configure pricing for each country you scale to")}
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
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
              <Plus size={18} />
              {t("adminCountryPricing.addPricing", "Add Country Pricing")}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.GRAY_400,
              }}
            />
            <input
              type="text"
              placeholder={t("adminCountryPricing.searchPlaceholder", "Search countries...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px 12px 40px",
                border: `1px solid ${COLORS.GRAY_300}`,
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.RED;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.GRAY_300;
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              background: COLORS.WHITE,
              padding: "20px",
              borderRadius: "12px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <Globe size={20} color={COLORS.BLUE} />
              <span style={{ fontSize: "14px", color: COLORS.GRAY_600, fontWeight: "500" }}>
                {t("adminCountryPricing.totalCountries", "Total Countries")}
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: COLORS.GRAY_800 }}>
              {countriesWithPricing.length}
            </div>
          </div>
          <div
            style={{
              background: COLORS.WHITE,
              padding: "20px",
              borderRadius: "12px",
              border: `1px solid ${COLORS.GRAY_200}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <DollarSign size={20} color={COLORS.GREEN} />
              <span style={{ fontSize: "14px", color: COLORS.GRAY_600, fontWeight: "500" }}>
                {t("adminCountryPricing.pricingConfigs", "Pricing Configs")}
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: COLORS.GRAY_800 }}>
              {countryPricing?.length || 0}
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: COLORS.GRAY_500 }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p>{t("adminCountryPricing.loading", "Loading country pricing...")}</p>
          </div>
        ) : error ? (
          <div
            style={{
              background: COLORS.RED_LIGHT,
              border: `1px solid ${COLORS.RED}`,
              borderRadius: "8px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: COLORS.RED,
            }}
          >
            <AlertCircle size={20} />
            <span>{t("adminCountryPricing.error", "Failed to load country pricing")}</span>
          </div>
        ) : (
          <div
            style={{
              background: COLORS.WHITE,
              borderRadius: "12px",
              border: `1px solid ${COLORS.GRAY_200}`,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.GRAY_50, borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_700 }}>
                      {t("adminCountryPricing.country", "Country")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_700 }}>
                      {t("adminCountryPricing.analysisType", "Analysis Type")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_700 }}>
                      {t("adminCountryPricing.price", "Price")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_700 }}>
                      {t("adminCountryPricing.currency", "Currency")}
                    </th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: COLORS.GRAY_700 }}>
                      {t("adminCountryPricing.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {countryPricing && countryPricing.length > 0 ? (
                    countryPricing.map((pricing) => (
                      <tr
                        key={pricing.id}
                        style={{
                          borderBottom: `1px solid ${COLORS.GRAY_100}`,
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = COLORS.GRAY_50;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.WHITE;
                        }}
                      >
                        <td style={{ padding: "16px", fontSize: "14px", color: COLORS.GRAY_800, fontWeight: "500" }}>
                          {pricing.country}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: COLORS.GRAY_700 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              background: pricing.analysisType === "image" ? COLORS.BLUE_LIGHT : COLORS.GREEN_LIGHT,
                              color: pricing.analysisType === "image" ? COLORS.BLUE : COLORS.GREEN,
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            {pricing.analysisType === "image" ? t("adminCountryPricing.image", "Image") : t("adminCountryPricing.standard", "Standard")}
                          </span>
                        </td>
                        <td style={{ padding: "16px", textAlign: "right", fontSize: "14px", color: COLORS.GRAY_800, fontWeight: "600" }}>
                          {pricing.pricePerAnalysis.toFixed(2)}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: COLORS.GRAY_700 }}>
                          {pricing.currency}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleOpenEditModal(pricing)}
                              style={{
                                padding: "6px 12px",
                                background: COLORS.BLUE_LIGHT,
                                color: COLORS.BLUE,
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Edit size={14} />
                              {t("adminCountryPricing.edit", "Edit")}
                            </button>
                            <button
                              onClick={() => handleDelete(pricing.id)}
                              style={{
                                padding: "6px 12px",
                                background: COLORS.RED_LIGHT,
                                color: COLORS.RED,
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Trash2 size={14} />
                              {t("adminCountryPricing.delete", "Delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: "60px", textAlign: "center", color: COLORS.GRAY_500 }}>
                        {t("adminCountryPricing.noPricing", "No country pricing configured yet. Click 'Add Country Pricing' to get started.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
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
            }}
            onClick={() => {
              if (!setPricingMutation.isPending) {
                setShowAddModal(false);
                setEditingPricing(null);
              }
            }}
          >
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "12px",
                padding: "32px",
                maxWidth: "500px",
                width: "90%",
                maxHeight: "90vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800, margin: 0 }}>
                  {editingPricing
                    ? t("adminCountryPricing.editPricing", "Edit Country Pricing")
                    : t("adminCountryPricing.addPricing", "Add Country Pricing")}
                </h2>
                <button
                  onClick={() => {
                    if (!setPricingMutation.isPending) {
                      setShowAddModal(false);
                      setEditingPricing(null);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: COLORS.GRAY_500,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700 }}>
                    {t("adminCountryPricing.country", "Country")} *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    disabled={!!editingPricing}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `1px solid ${COLORS.GRAY_300}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      background: editingPricing ? COLORS.GRAY_50 : COLORS.WHITE,
                    }}
                  >
                    <option value="">{t("adminCountryPricing.selectCountry", "Select a country")}</option>
                    {filteredCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700 }}>
                    {t("adminCountryPricing.analysisType", "Analysis Type")} *
                  </label>
                  <select
                    value={formData.analysisType}
                    onChange={(e) => setFormData({ ...formData, analysisType: e.target.value as "standard" | "image" })}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `1px solid ${COLORS.GRAY_300}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  >
                    <option value="standard">{t("adminCountryPricing.standard", "Standard (CSV/JSON)")}</option>
                    <option value="image">{t("adminCountryPricing.image", "Image")}</option>
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700 }}>
                    {t("adminCountryPricing.price", "Price")} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pricePerAnalysis}
                    onChange={(e) => setFormData({ ...formData, pricePerAnalysis: e.target.value })}
                    required
                    placeholder="10.00"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `1px solid ${COLORS.GRAY_300}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_700 }}>
                    {t("adminCountryPricing.currency", "Currency")} *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `1px solid ${COLORS.GRAY_300}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  >
                    <option value="GHS">GHS (Ghana Cedis)</option>
                    <option value="NGN">NGN (Nigerian Naira)</option>
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="ZAR">ZAR (South African Rand)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!setPricingMutation.isPending) {
                        setShowAddModal(false);
                        setEditingPricing(null);
                      }
                    }}
                    disabled={setPricingMutation.isPending}
                    style={{
                      padding: "12px 24px",
                      background: COLORS.GRAY_100,
                      color: COLORS.GRAY_700,
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: setPricingMutation.isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {t("adminCountryPricing.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={setPricingMutation.isPending}
                    style={{
                      padding: "12px 24px",
                      background: COLORS.RED,
                      color: COLORS.WHITE,
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: setPricingMutation.isPending ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {setPricingMutation.isPending ? (
                      <>
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        {t("adminCountryPricing.saving", "Saving...")}
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {t("adminCountryPricing.save", "Save")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  );
}

