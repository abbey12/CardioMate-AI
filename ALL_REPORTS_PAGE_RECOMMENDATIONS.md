# All Reports Page Recommendations

## Overview
Create a dedicated "All Reports" page that provides a comprehensive view of all ECG reports with advanced filtering, sorting, and viewing options.

## Current State
The Facility Dashboard currently shows a list of reports with basic pagination and date filtering. The new "All Reports" page should be a more feature-rich, dedicated view.

## Recommended Features

### 1. **Enhanced Table View**
- **Columns to Display:**
  - Report ID (clickable to view details)
  - Patient Name
  - Age & Sex
  - Date/Time Created
  - Heart Rate
  - Rhythm
  - Abnormalities Count (with indicator)
  - Status Badge (Normal/Abnormal)
  - Actions (View, Download PDF, Forward to WhatsApp)

- **Table Features:**
  - Sortable columns (click headers to sort)
  - Resizable columns
  - Column visibility toggle (show/hide columns)
  - Sticky header (stays visible when scrolling)
  - Row selection (checkbox for bulk actions)

### 2. **Advanced Filtering**
- **Quick Filters:**
  - All Reports
  - Normal Only
  - Abnormal Only
  - Last 7 Days
  - Last 30 Days
  - This Month
  - This Year

- **Advanced Filters Panel:**
  - Date Range (from/to)
  - Patient Name (search)
  - Age Range (min/max)
  - Sex (male/female/other/unknown)
  - Heart Rate Range (min/max bpm)
  - Rhythm Type (dropdown)
  - Abnormality Type (multi-select)
  - Source Format (CSV/JSON/Image)
  - Has Recommendations (yes/no)
  - Clinical Indication (search)

- **Filter Presets:**
  - Save custom filter combinations
  - Quick access to saved filters
  - Share filter URLs

### 3. **View Modes**
- **Table View** (default) - Traditional table layout
- **Card View** - Card-based layout with more details visible
- **Timeline View** - Chronological timeline view
- **Grid View** - Compact grid with thumbnails

### 4. **Search & Sorting**
- **Global Search:**
  - Search across all fields (patient name, report ID, rhythm, abnormalities)
  - Highlight search terms
  - Search suggestions/autocomplete

- **Sorting:**
  - Multi-column sorting
  - Sort by: Date, Patient Name, Heart Rate, Abnormality Count
  - Ascending/Descending toggle
  - Default sort: Most recent first

### 5. **Bulk Actions**
- **Select Multiple Reports:**
  - Checkbox selection
  - Select All / Deselect All
  - Select by filter

- **Bulk Operations:**
  - Download PDFs (zip file)
  - Export to CSV
  - Forward to WhatsApp (batch)
  - Delete (with confirmation)

### 6. **Pagination & Display Options**
- **Pagination:**
  - Page size options (10, 25, 50, 100, All)
  - Jump to page
  - Total count display
  - "Showing X-Y of Z reports"

- **Display Options:**
  - Items per page
  - Compact/Dense view toggle
  - Show/hide columns

### 7. **Quick Actions**
- **Row Actions:**
  - View Full Report (opens in new tab/modal)
  - Download PDF
  - Forward to WhatsApp
  - Copy Report Link
  - Duplicate Report (if needed)

- **Bulk Actions Bar:**
  - Appears when items are selected
  - Shows count of selected items
  - Quick action buttons

### 8. **Statistics Summary**
- **Top Bar Summary:**
  - Total Reports (with filter context)
  - Normal Reports Count
  - Abnormal Reports Count
  - Average Heart Rate
  - Most Common Abnormality
  - Date Range Summary

### 9. **Export Options**
- **Export Formats:**
  - CSV Export (filtered data)
  - Excel Export (.xlsx)
  - PDF Summary Report
  - JSON Export (for API integration)

- **Export Options:**
  - Include all columns or selected columns
  - Include patient data (yes/no)
  - Date range for export

### 10. **Performance Optimizations**
- **Virtual Scrolling:**
  - For large datasets (1000+ reports)
  - Lazy loading of rows
  - Infinite scroll option

- **Caching:**
  - Cache filter results
  - Debounce search input
  - Optimistic UI updates

### 11. **Visual Enhancements**
- **Status Indicators:**
  - Color-coded status badges
  - Abnormality count badges
  - Priority indicators

- **Icons:**
  - Report type icons (CSV/JSON/Image)
  - Status icons (Normal/Abnormal)
  - Action icons

- **Hover Effects:**
  - Row highlight on hover
  - Quick preview on hover
  - Tooltips for truncated text

### 12. **Accessibility**
- **Keyboard Navigation:**
  - Tab through filters
  - Arrow keys for row navigation
  - Enter to select/view
  - Escape to close modals

- **Screen Reader Support:**
  - ARIA labels
  - Descriptive text
  - Status announcements

## Technical Implementation

### Backend Endpoints Needed:
1. `GET /facility/reports` (already exists, enhance with more filters)
2. `POST /facility/reports/bulk-download` - Bulk PDF download
3. `POST /facility/reports/bulk-export` - Bulk CSV export
4. `GET /facility/reports/search` - Advanced search endpoint

### Frontend Components:
1. **AllReportsPage** - Main page component
2. **ReportsTable** - Enhanced table component
3. **ReportsCardView** - Card view component
4. **ReportsTimelineView** - Timeline view component
5. **FilterPanel** - Advanced filtering panel
6. **BulkActionsBar** - Bulk actions toolbar
7. **ReportRow** - Individual report row component
8. **QuickFilters** - Quick filter buttons
9. **ExportModal** - Export options modal
10. **SearchBar** - Global search component

### State Management:
- Use React Query for server state
- Local state for filters, view mode, selections
- URL params for filter state (shareable links)

### Libraries to Consider:
- **React Table (TanStack Table)** - For advanced table features
- **React Virtual** - For virtual scrolling
- **Date-fns** - For date formatting
- **XLSX** - For Excel export

## UI/UX Design

### Layout:
- **Top Section:**
  - Page title and breadcrumbs
  - Statistics summary cards
  - Quick filters bar

- **Filter Section:**
  - Collapsible advanced filters panel
  - Global search bar
  - View mode toggle

- **Main Content:**
  - Reports table/cards/grid
  - Bulk actions bar (when items selected)
  - Pagination controls

- **Bottom Section:**
  - Export options
  - Display preferences

### Color Scheme:
- Use existing light theme
- Status colors: Green (normal), Red (abnormal), Blue (info)
- Hover states with subtle backgrounds

## Implementation Priority

### Phase 1 (MVP):
1. Enhanced table with sortable columns
2. Advanced filtering (date range, patient name, abnormalities)
3. Search functionality
4. View/Download/Forward actions
5. Pagination improvements

### Phase 2:
1. Multiple view modes (Card, Timeline)
2. Bulk actions
3. Export options (CSV, PDF)
4. Filter presets

### Phase 3:
1. Virtual scrolling
2. Advanced search
3. Excel export
4. Performance optimizations

## Comparison with Dashboard

| Feature | Dashboard | All Reports Page |
|---------|-----------|------------------|
| Purpose | Overview + Quick Access | Comprehensive Management |
| Reports Display | Simple table | Enhanced table with multiple views |
| Filtering | Basic (date range) | Advanced (multiple criteria) |
| Sorting | Limited | Full column sorting |
| Bulk Actions | No | Yes |
| Export | CSV only | Multiple formats |
| View Modes | Table only | Table/Card/Timeline/Grid |
| Search | Basic | Advanced global search |

## Benefits

1. **Better Organization**: Dedicated space for report management
2. **Improved Efficiency**: Advanced filtering saves time
3. **Bulk Operations**: Handle multiple reports at once
4. **Better UX**: Multiple view modes for different use cases
5. **Scalability**: Handles large datasets better
6. **Professional**: More enterprise-grade interface

