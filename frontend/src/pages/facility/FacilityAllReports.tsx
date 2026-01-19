import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getFacilityReports,
  exportReportsCsv,
  downloadReportPdf,
} from "../../lib/api";
import type { EcgStructuredReport } from "../../ui/types";
import { Layout } from "../../components/layout/Layout";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  CheckSquare,
  Square,
  FileDown,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type SortField = "date" | "patient" | "heartRate" | "rhythm" | "abnormalities";
type SortDirection = "asc" | "desc";

export function FacilityAllReports() {
  const { token, isFacility, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [filterNormal, setFilterNormal] = useState<boolean | null>(null); // null = all, true = normal only, false = abnormal only
  const [filterRhythm, setFilterRhythm] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Bulk selection
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const handleTokenRefresh = (newToken: string) => {
    localStorage.setItem("accessToken", newToken);
  };

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
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

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...reports];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.patient?.name?.toLowerCase().includes(query) ||
          report.id.toLowerCase().includes(query) ||
          report.measurements.rhythm?.toLowerCase().includes(query) ||
          report.abnormalities?.some((abn) => abn.toLowerCase().includes(query))
      );
    }

    // Normal/Abnormal filter
    if (filterNormal !== null) {
      filtered = filtered.filter((report) => {
        const hasAbnormalities = (report.abnormalities?.length || 0) > 0;
        return filterNormal ? !hasAbnormalities : hasAbnormalities;
      });
    }

    // Rhythm filter
    if (filterRhythm) {
      filtered = filtered.filter(
        (report) => report.measurements.rhythm?.toLowerCase() === filterRhythm.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "patient":
          aValue = a.patient?.name || "";
          bValue = b.patient?.name || "";
          break;
        case "heartRate":
          aValue = a.measurements.heartRateBpm || 0;
          bValue = b.measurements.heartRateBpm || 0;
          break;
        case "rhythm":
          aValue = a.measurements.rhythm || "";
          bValue = b.measurements.rhythm || "";
          break;
        case "abnormalities":
          aValue = a.abnormalities?.length || 0;
          bValue = b.abnormalities?.length || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reports, searchQuery, filterNormal, filterRhythm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSelectAll = () => {
    if (selectedReports.size === filteredAndSortedReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredAndSortedReports.map((r) => r.id)));
    }
  };

  const handleSelectReport = (reportId: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleBulkDownload = async () => {
    if (selectedReports.size === 0) return;
    
    // Download each selected report
    for (const reportId of selectedReports) {
      try {
        await downloadReportPdf(token!, reportId, handleTokenRefresh);
        // Small delay to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Failed to download report ${reportId}:`, err);
        }
      }
    }
    
    setSelectedReports(new Set());
    alert(`Downloaded ${selectedReports.size} report(s)`);
  };

  const handleBulkExport = async () => {
    if (selectedReports.size === 0) return;
    try {
      // For now, export all filtered reports (can be enhanced to export only selected)
      await exportReportsCsv(token!, fromDate || undefined, toDate || undefined, handleTokenRefresh);
      setSelectedReports(new Set());
    } catch (err: any) {
      if (err?.message?.includes("Session expired")) {
        logout();
        navigate("/login");
      } else {
        alert(err?.message || "Failed to export CSV");
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setFilterNormal(null);
    setFilterRhythm("");
    setCurrentPage(1);
  };

  const getUniqueRhythms = () => {
    const rhythms = new Set<string>();
    reports.forEach((report) => {
      if (report.measurements.rhythm) {
        rhythms.add(report.measurements.rhythm);
      }
    });
    return Array.from(rhythms).sort();
  };

  if (!isFacility || !token) {
    return null;
  }

  const hasActiveFilters = searchQuery || fromDate || toDate || filterNormal !== null || filterRhythm;
  const allSelected = filteredAndSortedReports.length > 0 && selectedReports.size === filteredAndSortedReports.length;
  const someSelected = selectedReports.size > 0 && selectedReports.size < filteredAndSortedReports.length;

  return (
    <Layout>
      <div>
        {/* Page Header */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
              {t("facilityAllReports.title")}
            </h1>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
              {t("facilityAllReports.subtitle")}
            </p>
          </div>
          <Link
            to="/facility/upload"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            <FileText size={16} />
            {t("facilityAllReports.actions.uploadNew")}
          </Link>
        </div>

        {/* Filters Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          {/* Quick Filters */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setFilterNormal(null);
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: filterNormal === null ? "2px solid #2563eb" : "1px solid #e2e8f0",
                background: filterNormal === null ? "#eff6ff" : "#ffffff",
                color: filterNormal === null ? "#2563eb" : "#64748b",
                fontSize: "14px",
                fontWeight: filterNormal === null ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("facilityAllReports.filters.allReports")}
            </button>
            <button
              onClick={() => {
                setFilterNormal(true);
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: filterNormal === true ? "2px solid #16a34a" : "1px solid #e2e8f0",
                background: filterNormal === true ? "#f0fdf4" : "#ffffff",
                color: filterNormal === true ? "#16a34a" : "#64748b",
                fontSize: "14px",
                fontWeight: filterNormal === true ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("facilityAllReports.filters.normalOnly")}
            </button>
            <button
              onClick={() => {
                setFilterNormal(false);
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: filterNormal === false ? "2px solid #dc2626" : "1px solid #e2e8f0",
                background: filterNormal === false ? "#fef2f2" : "#ffffff",
                color: filterNormal === false ? "#dc2626" : "#64748b",
                fontSize: "14px",
                fontWeight: filterNormal === false ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("facilityAllReports.filters.abnormalOnly")}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <X size={16} />
                {t("facilityAllReports.filters.clear")}
              </button>
            )}
          </div>

          {/* Search and Date Filters */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "16px", alignItems: "end" }}>
            {/* Global Search */}
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
                placeholder={t("facilityAllReports.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
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
                {t("facilityAllReports.filters.fromDate")}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
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
                }}
              />
            </div>

            {/* To Date */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                {t("facilityAllReports.filters.toDate")}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
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
                }}
              />
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: showAdvancedFilters ? "#2563eb" : "#f1f5f9",
                color: showAdvancedFilters ? "#ffffff" : "#64748b",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Filter size={16} />
              {t("facilityAllReports.filters.advanced")}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    {t("facilityAllReports.filters.rhythm")}
                  </label>
                  <select
                    value={filterRhythm}
                    onChange={(e) => {
                      setFilterRhythm(e.target.value);
                      setCurrentPage(1);
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
                    }}
                  >
                    <option value="">{t("facilityAllReports.filters.allRhythms")}</option>
                    {getUniqueRhythms().map((rhythm) => (
                      <option key={rhythm} value={rhythm}>
                        {rhythm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedReports.size > 0 && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "16px 24px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}>
              {t("facilityAllReports.bulk.selected", { count: selectedReports.size })}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBulkDownload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#2563eb";
                }}
              >
                <Download size={14} />
                {t("facilityAllReports.bulk.download")}
              </button>
              <button
                onClick={handleBulkExport}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#059669";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#10b981";
                }}
              >
                <FileDown size={14} />
                {t("facilityAllReports.bulk.exportCsv")}
              </button>
              <button
                onClick={() => setSelectedReports(new Set())}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#ffffff",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <X size={14} />
                {t("facilityAllReports.bulk.clearSelection")}
              </button>
            </div>
          </div>
        )}

        {/* Reports Table */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Showing {filteredAndSortedReports.length} of {totalReports} {totalReports === 1 ? "report" : "reports"}
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <label style={{ fontSize: "14px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isSelecting}
                  onChange={(e) => setIsSelecting(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                {t("facilityAllReports.selection.enable")}
              </label>
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
                <option value={10}>{t("facilityAllReports.pagination.perPage", { count: 10 })}</option>
                <option value={25}>{t("facilityAllReports.pagination.perPage", { count: 25 })}</option>
                <option value={50}>{t("facilityAllReports.pagination.perPage", { count: 50 })}</option>
                <option value={100}>{t("facilityAllReports.pagination.perPage", { count: 100 })}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {reportsLoading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <div>{t("facilityAllReports.loading")}</div>
            </div>
          ) : filteredAndSortedReports.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {isSelecting && (
                      <th
                        style={{
                          padding: "16px 24px",
                          textAlign: "left",
                          width: "50px",
                        }}
                      >
                        <button
                          onClick={handleSelectAll}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {allSelected ? (
                            <CheckSquare size={20} color="#2563eb" />
                          ) : someSelected ? (
                            <CheckSquare size={20} color="#94a3b8" style={{ opacity: 0.5 }} />
                          ) : (
                            <Square size={20} color="#94a3b8" />
                          )}
                        </button>
                      </th>
                    )}
                    <SortableHeader
                      field="date"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      {t("facilityAllReports.table.dateTime")}
                    </SortableHeader>
                    <SortableHeader
                      field="patient"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      {t("facilityAllReports.table.patient")}
                    </SortableHeader>
                    <SortableHeader
                      field="heartRate"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      {t("facilityAllReports.table.heartRate")}
                    </SortableHeader>
                    <SortableHeader
                      field="rhythm"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      {t("facilityAllReports.table.rhythm")}
                    </SortableHeader>
                    <SortableHeader
                      field="abnormalities"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      {t("facilityAllReports.table.status")}
                    </SortableHeader>
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
                      {t("facilityAllReports.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedReports.map((report, index) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      index={index}
                      isSelected={selectedReports.has(report.id)}
                      onSelect={isSelecting ? () => handleSelectReport(report.id) : undefined}
                      token={token!}
                      onTokenRefresh={handleTokenRefresh}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "16px", marginBottom: "8px" }}>{t("facilityAllReports.empty.title")}</div>
              <div style={{ fontSize: "14px" }}>
                {hasActiveFilters ? t("facilityAllReports.empty.tryFilters") : t("facilityAllReports.empty.uploadFirst")}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: "14px", color: "#64748b" }}>
                {t("facilityAllReports.pagination.pageOf", { page: currentPage, total: totalPages })}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: currentPage === 1 ? "#f1f5f9" : "#ffffff",
                    color: currentPage === 1 ? "#94a3b8" : "#64748b",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: currentPage === 1 ? "#f1f5f9" : "#ffffff",
                    color: currentPage === 1 ? "#94a3b8" : "#64748b",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: currentPage === totalPages ? "#f1f5f9" : "#ffffff",
                    color: currentPage === totalPages ? "#94a3b8" : "#64748b",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: currentPage === totalPages ? "#f1f5f9" : "#ffffff",
                    color: currentPage === totalPages ? "#94a3b8" : "#64748b",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SortableHeader({
  field,
  currentField,
  direction,
  onSort,
  children,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = currentField === field;
  
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "16px 24px",
        textAlign: "left",
        fontSize: "12px",
        fontWeight: "600",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        borderBottom: "1px solid #e2e8f0",
        cursor: "pointer",
        userSelect: "none",
        background: isActive ? "#eff6ff" : "#f8fafc",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eff6ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isActive ? "#eff6ff" : "#f8fafc";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {children}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp size={14} color="#2563eb" />
          ) : (
            <ArrowDown size={14} color="#2563eb" />
          )
        ) : (
          <ArrowUpDown size={14} color="#94a3b8" style={{ opacity: 0.5 }} />
        )}
      </div>
    </th>
  );
}

function ReportRow({
  report,
  index,
  isSelected,
  onSelect,
  token,
  onTokenRefresh,
}: {
  report: EcgStructuredReport;
  index: number;
  isSelected: boolean;
  onSelect?: () => void;
  token: string;
  onTokenRefresh: (newToken: string) => void;
}) {
  const { t } = useTranslation();
  const hasAbnormalities = (report.abnormalities?.length || 0) > 0;
  const date = new Date(report.createdAt);

  return (
    <tr
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: isSelected ? "#eff6ff" : index % 2 === 0 ? "#ffffff" : "#f8fafc",
        transition: "all 0.15s",
        cursor: onSelect ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "#f1f5f9";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        }
      }}
      onClick={onSelect}
    >
      {onSelect && (
        <td style={{ padding: "16px 24px" }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            style={{ cursor: "pointer" }}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      )}
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
        {report.patient?.age && (
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {t("facilityAllReports.table.ageSex", {
              age: report.patient.age,
              sex: report.patient.sex || "—",
            })}
          </div>
        )}
        {report.patient?.medicalRecordNumber && (
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {t("facilityAllReports.patient.mrn", { mrn: report.patient.medicalRecordNumber })}
          </div>
        )}
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
          {report.measurements.heartRateBpm || "—"}
          {report.measurements.heartRateBpm && (
            <span style={{ fontSize: "12px", fontWeight: "400", color: "#64748b", marginLeft: "4px" }}>
              {t("facilityAllReports.units.bpm")}
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
            {t("facilityAllReports.table.findings", { count: report.abnormalities.length })}
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
            {t("facilityAllReports.table.normal")}
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
              background: "#2563eb",
              color: "white",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            <Eye size={14} />
            {t("facilityAllReports.table.view")}
          </Link>
        </div>
      </td>
    </tr>
  );
}

