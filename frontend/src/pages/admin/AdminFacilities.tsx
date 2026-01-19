import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFacilities, deleteFacility, facilitySignup, getAdminFacilityDetails, getAdminStats, type Facility, type FacilitySignupData } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Eye,
  X,
  Check,
  Loader2,
  AlertCircle,
  Mail,
  Building2,
  Lock,
  FileText,
  Wallet,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Activity,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../ui/colors";

export function AdminFacilities() {
  const { token, isAdmin } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingFacilityId, setViewingFacilityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "reports">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [newFacility, setNewFacility] = useState<FacilitySignupData>({
    name: "",
    email: "",
    password: "",
  });

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: facilities, isLoading } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: () => getFacilities(token!),
    enabled: !!token && isAdmin,
  });

  const { data: adminStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => getAdminStats(token!),
    enabled: !!token && isAdmin,
  });

  const { data: facilityDetails, isLoading: facilityDetailsLoading } = useQuery({
    queryKey: ["facilityDetails", viewingFacilityId],
    queryFn: () => getAdminFacilityDetails(token!, viewingFacilityId!, handleTokenRefresh),
    enabled: !!token && isAdmin && !!viewingFacilityId,
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: (id: string) => deleteFacility(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: (data: FacilitySignupData) => facilitySignup(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setShowCreateModal(false);
      setNewFacility({ name: "", email: "", password: "", referralCode: null });
    },
  });

  if (!isAdmin || !token) {
    return null;
  }

  // Enhanced filtering and sorting
  const filteredAndSortedFacilities = useMemo(() => {
    let filtered = facilities?.filter((facility) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return facility.name.toLowerCase().includes(query) || facility.email.toLowerCase().includes(query);
    }) || [];

    // Sort facilities
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "reports":
          // We'd need report counts for each facility - for now, use date
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [facilities, searchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFacilities.length / itemsPerPage);
  const paginatedFacilities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedFacilities.slice(start, start + itemsPerPage);
  }, [filteredAndSortedFacilities, currentPage, itemsPerPage]);

  // Summary stats
  const totalFacilities = facilities?.length || 0;
  const activeFacilities = facilities?.length || 0; // Could be enhanced with last activity check
  const totalRevenue = adminStats?.revenue?.totalRevenue || 0;
  const totalReports = adminStats?.totalReports || 0;

  const handleCreate = () => {
    if (!newFacility.name || !newFacility.email || newFacility.password.length < 8) {
      return;
    }
    createFacilityMutation.mutate(newFacility);
  };

  const handleDelete = (facility: Facility) => {
    if (confirm(t("adminFacilities.confirmDelete", { name: facility.name }))) {
      deleteFacilityMutation.mutate(facility.id);
    }
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: "100%" }}>
        {/* Header */}
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
              {t("adminFacilities.title")}
            </h1>
            <p style={{ fontSize: "16px", color: COLORS.GRAY_500, margin: 0 }}>
              {t("adminFacilities.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                // Export to CSV
                const csv = [
                  ["Name", "Email", "Created At", "ID"].join(","),
                  ...(facilities || []).map((f) => [f.name, f.email, f.createdAt, f.id].join(",")),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `facilities-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_600,
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
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.RED,
                color: COLORS.WHITE,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
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
              {t("adminFacilities.actions.create")}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
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
                <Building2 size={20} color={COLORS.RED} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>Total Facilities</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{totalFacilities}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.BLUE}15 0%, ${COLORS.BLUE}05 100%)`,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${COLORS.BLUE}20`,
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
                <Activity size={20} color={COLORS.BLUE} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>Active Facilities</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{activeFacilities}</div>
              </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
                <FileText size={20} color={COLORS.SUCCESS} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>Total Reports</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>{totalReports}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.WARNING}15 0%, ${COLORS.WARNING}05 100%)`,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${COLORS.WARNING}20`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
              <div>
                <div style={{ fontSize: "12px", color: COLORS.GRAY_600, fontWeight: "500" }}>Total Revenue</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                  ₵{totalRevenue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort */}
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1", minWidth: "250px" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.GRAY_400,
              }}
            />
            <input
              type="text"
              placeholder={t("adminFacilities.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              style={{
                width: "100%",
                padding: "12px 16px 12px 48px",
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                fontSize: "14px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_800,
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.RED;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.RED}1A`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.GRAY_200;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as "name" | "date" | "reports");
                setCurrentPage(1);
              }}
              style={{
                padding: "12px 16px",
                border: `1px solid ${COLORS.GRAY_200}`,
                borderRadius: "8px",
                fontSize: "14px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_800,
                cursor: "pointer",
              }}
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="reports">Sort by Reports</option>
            </select>
            <button
              onClick={() => {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                setCurrentPage(1);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 16px",
                background: COLORS.WHITE,
                color: COLORS.GRAY_600,
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
              <ArrowUpDown size={16} />
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>

        {/* Facilities Table */}
        <div
          style={{
            background: COLORS.WHITE,
            borderRadius: "16px",
            border: `1px solid ${COLORS.GRAY_200}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              {t("adminFacilities.loading")}
            </div>
          ) : paginatedFacilities.length > 0 ? (
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
                      {t("adminFacilities.table.facility")}
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
                      {t("adminFacilities.table.email")}
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
                      {t("adminFacilities.table.created")}
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
                      {t("adminFacilities.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFacilities.map((facility, index) => (
                    <tr
                      key={facility.id}
                      style={{
                        borderBottom: index < paginatedFacilities.length - 1 ? `1px solid ${COLORS.GRAY_200}` : "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.GRAY_50;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = COLORS.WHITE;
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
                              {facility.name}
                            </div>
                          </div>
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
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setViewingFacilityId(facility.id)}
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
                            {t("adminFacilities.actions.view")}
                          </button>
                          <button
                            onClick={() => handleDelete(facility)}
                            disabled={deleteFacilityMutation.isPending}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 12px",
                              background: COLORS.RED_LIGHT,
                              color: COLORS.RED,
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "500",
                              cursor: deleteFacilityMutation.isPending ? "not-allowed" : "pointer",
                              transition: "all 0.2s",
                              opacity: deleteFacilityMutation.isPending ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (!deleteFacilityMutation.isPending) {
                                e.currentTarget.style.background = COLORS.RED;
                                e.currentTarget.style.color = COLORS.WHITE;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!deleteFacilityMutation.isPending) {
                                e.currentTarget.style.background = COLORS.RED_LIGHT;
                                e.currentTarget.style.color = COLORS.RED;
                              }
                            }}
                          >
                            <Trash2 size={14} />
                            {t("adminFacilities.actions.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
              {searchQuery ? t("adminFacilities.empty.search") : t("adminFacilities.empty.default")}
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedFacilities.length > itemsPerPage && (
            <div
              style={{
                padding: "20px 24px",
                borderTop: `1px solid ${COLORS.GRAY_200}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "14px", color: COLORS.GRAY_600 }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedFacilities.length)} of{" "}
                {filteredAndSortedFacilities.length} facilities
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    background: currentPage === 1 ? COLORS.GRAY_100 : COLORS.WHITE,
                    color: currentPage === 1 ? COLORS.GRAY_400 : COLORS.GRAY_700,
                    border: `1px solid ${COLORS.GRAY_200}`,
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage > 1) {
                      e.currentTarget.style.background = COLORS.GRAY_50;
                      e.currentTarget.style.borderColor = COLORS.GRAY_300;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage > 1) {
                      e.currentTarget.style.background = COLORS.WHITE;
                      e.currentTarget.style.borderColor = COLORS.GRAY_200;
                    }
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <div style={{ display: "flex", gap: "4px" }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          minWidth: "36px",
                          height: "36px",
                          padding: "0 8px",
                          background: currentPage === pageNum ? COLORS.RED : COLORS.WHITE,
                          color: currentPage === pageNum ? COLORS.WHITE : COLORS.GRAY_700,
                          border: `1px solid ${currentPage === pageNum ? COLORS.RED : COLORS.GRAY_200}`,
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: currentPage === pageNum ? "600" : "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.background = COLORS.GRAY_50;
                            e.currentTarget.style.borderColor = COLORS.GRAY_300;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.background = COLORS.WHITE;
                            e.currentTarget.style.borderColor = COLORS.GRAY_200;
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    background: currentPage === totalPages ? COLORS.GRAY_100 : COLORS.WHITE,
                    color: currentPage === totalPages ? COLORS.GRAY_400 : COLORS.GRAY_700,
                    border: `1px solid ${COLORS.GRAY_200}`,
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage < totalPages) {
                      e.currentTarget.style.background = COLORS.GRAY_50;
                      e.currentTarget.style.borderColor = COLORS.GRAY_300;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage < totalPages) {
                      e.currentTarget.style.background = COLORS.WHITE;
                      e.currentTarget.style.borderColor = COLORS.GRAY_200;
                    }
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Facility Details Modal */}
        {viewingFacilityId && (
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
            onClick={() => setViewingFacilityId(null)}
          >
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800, margin: 0 }}>
                  {t("adminFacilities.modal.title")}
                </h2>
                <button
                  onClick={() => setViewingFacilityId(null)}
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

              {facilityDetailsLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                  <div>{t("adminFacilities.modal.loading")}</div>
                </div>
              ) : facilityDetails ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Facility Info */}
                  <div
                    style={{
                      padding: "20px",
                      background: COLORS.GRAY_50,
                      borderRadius: "12px",
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
                        <Building2 size={24} color={COLORS.RED} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "20px", fontWeight: "600", color: COLORS.GRAY_800, margin: "0 0 4px 0" }}>
                          {facilityDetails.name}
                        </h3>
                        <div style={{ fontSize: "14px", color: COLORS.GRAY_500 }}>{facilityDetails.email}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                          {t("adminFacilities.modal.created")}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800 }}>
                          {new Date(facilityDetails.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                          {t("adminFacilities.modal.facilityId")}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.GRAY_800, fontFamily: "monospace" }}>
                          {facilityDetails.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div
                      style={{
                        padding: "20px",
                        background: COLORS.WHITE,
                        borderRadius: "12px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
                          <FileText size={20} color={COLORS.BLUE} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                            {t("adminFacilities.modal.totalReports")}
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                            {facilityDetails.totalReports || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "20px",
                        background: COLORS.WHITE,
                        borderRadius: "12px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
                          <Wallet size={20} color={COLORS.SUCCESS} />
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: COLORS.GRAY_500, marginBottom: "4px" }}>
                            {t("adminFacilities.modal.walletBalance")}
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800 }}>
                            ₵{facilityDetails.walletBalance?.toFixed(2) || "0.00"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div
                    style={{
                      padding: "20px",
                      background: COLORS.BLUE_LIGHT,
                      borderRadius: "12px",
                      border: `1px solid ${COLORS.BLUE_BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "500", color: COLORS.BLUE_DARK, marginBottom: "8px" }}>
                      {t("adminFacilities.modal.quickActions.title")}
                    </div>
                    <div style={{ fontSize: "12px", color: COLORS.GRAY_600, lineHeight: "1.6" }}>
                      • {t("adminFacilities.modal.quickActions.reports")}
                      <br />
                      • {t("adminFacilities.modal.quickActions.revenue")}
                      <br />
                      • {t("adminFacilities.modal.quickActions.activity")}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: COLORS.GRAY_400 }}>
                  {t("adminFacilities.modal.failedToLoad")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Facility Modal */}
        {showCreateModal && (
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
            onClick={() => setShowCreateModal(false)}
          >
            <div
              style={{
                background: COLORS.WHITE,
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "500px",
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: COLORS.GRAY_800, margin: 0 }}>
                  {t("adminFacilities.createModal.title")}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
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

              {createFacilityMutation.isError && (
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
                  <AlertCircle size={16} />
                  {(createFacilityMutation.error as any)?.message || t("adminFacilities.createModal.error")}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: COLORS.GRAY_700,
                      marginBottom: "8px",
                    }}
                  >
                    {t("adminFacilities.createModal.fields.name")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Building2
                      size={20}
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
                      value={newFacility.name}
                      onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                      placeholder={t("adminFacilities.createModal.placeholders.name")}
                      style={{
                        width: "100%",
                        padding: "12px 12px 12px 44px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = COLORS.RED;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.RED}1A`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = COLORS.GRAY_200;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: COLORS.GRAY_700,
                      marginBottom: "8px",
                    }}
                  >
                    {t("adminFacilities.createModal.fields.email")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={20}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: COLORS.GRAY_400,
                      }}
                    />
                    <input
                      type="email"
                      value={newFacility.email}
                      onChange={(e) => setNewFacility({ ...newFacility, email: e.target.value })}
                      placeholder={t("adminFacilities.createModal.placeholders.email")}
                      style={{
                        width: "100%",
                        padding: "12px 12px 12px 44px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = COLORS.RED;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.RED}1A`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = COLORS.GRAY_200;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: COLORS.GRAY_700,
                      marginBottom: "8px",
                    }}
                  >
                    {t("adminFacilities.createModal.fields.password")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={20}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: COLORS.GRAY_400,
                      }}
                    />
                    <input
                      type="password"
                      value={newFacility.password}
                      onChange={(e) => setNewFacility({ ...newFacility, password: e.target.value })}
                      placeholder={t("adminFacilities.createModal.placeholders.password")}
                      style={{
                        width: "100%",
                        padding: "12px 12px 12px 44px",
                        border: `1px solid ${COLORS.GRAY_200}`,
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: COLORS.WHITE,
                        color: COLORS.GRAY_800,
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = COLORS.RED;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.RED}1A`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = COLORS.GRAY_200;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "6px", marginBottom: 0 }}>
                    {t("adminFacilities.createModal.hints.password")}
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: COLORS.GRAY_700,
                      marginBottom: "8px",
                    }}
                  >
                    {t("adminFacilities.createModal.fields.referral")}
                  </label>
                  <input
                    type="text"
                    value={newFacility.referralCode || ""}
                    onChange={(e) => setNewFacility({ ...newFacility, referralCode: e.target.value || null })}
                    placeholder={t("adminFacilities.createModal.placeholders.referral")}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: `1px solid ${COLORS.GRAY_200}`,
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: COLORS.WHITE,
                      color: COLORS.GRAY_800,
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.BLUE;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.BLUE}1A`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = COLORS.GRAY_200;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <p style={{ fontSize: "12px", color: COLORS.GRAY_400, marginTop: "6px", marginBottom: 0 }}>
                    {t("adminFacilities.createModal.hints.referral")}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewFacility({ name: "", email: "", password: "", referralCode: null });
                    }}
                    style={{
                      padding: "10px 20px",
                      background: COLORS.GRAY_100,
                      color: COLORS.GRAY_700,
                      border: "none",
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
                    {t("adminFacilities.actions.cancel")}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={
                      !newFacility.name ||
                      !newFacility.email ||
                      newFacility.password.length < 8 ||
                      createFacilityMutation.isPending
                    }
                    style={{
                      padding: "10px 20px",
                      background:
                        !newFacility.name || !newFacility.email || newFacility.password.length < 8
                          ? COLORS.GRAY_300
                          : COLORS.RED,
                      color: COLORS.WHITE,
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor:
                        !newFacility.name || !newFacility.email || newFacility.password.length < 8
                          ? "not-allowed"
                          : "pointer",
                      transition: "all 0.2s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        newFacility.name &&
                        newFacility.email &&
                        newFacility.password.length >= 8 &&
                        !createFacilityMutation.isPending
                      ) {
                        e.currentTarget.style.background = COLORS.RED_DARK;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (
                        newFacility.name &&
                        newFacility.email &&
                        newFacility.password.length >= 8 &&
                        !createFacilityMutation.isPending
                      ) {
                        e.currentTarget.style.background = COLORS.RED;
                      }
                    }}
                  >
                    {createFacilityMutation.isPending ? (
                      <>
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        {t("adminFacilities.createModal.creating")}
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        {t("adminFacilities.actions.create")}
                      </>
                    )}
                  </button>
                </div>
              </div>
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

