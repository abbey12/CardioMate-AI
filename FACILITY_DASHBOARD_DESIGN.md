# Modern Facility Dashboard Design

## Design System

### Color Palette
- **Primary**: #2563eb (Blue-600) - Trust, medical
- **Secondary**: #10b981 (Emerald-500) - Health, success
- **Accent**: #f59e0b (Amber-500) - Alerts, warnings
- **Danger**: #ef4444 (Red-500) - Critical findings
- **Background**: #f8fafc (Slate-50) - Light background
- **Surface**: #ffffff - Cards, panels
- **Text Primary**: #1e293b (Slate-800)
- **Text Secondary**: #64748b (Slate-500)
- **Border**: #e2e8f0 (Slate-200)

### Typography
- **Heading 1**: 32px, Bold, Slate-900
- **Heading 2**: 24px, Semibold, Slate-800
- **Heading 3**: 18px, Semibold, Slate-700
- **Body**: 14px, Regular, Slate-600
- **Small**: 12px, Regular, Slate-500

### Spacing
- Base unit: 4px
- Common: 8px, 12px, 16px, 20px, 24px, 32px, 40px

### Components

#### Top NavBar
- Height: 64px
- Fixed at top
- Contains:
  - Logo/Brand name
  - Facility name
  - User menu (avatar, name, logout)
  - Notifications icon (optional)

#### SideNavBar
- Width: 256px (collapsed: 64px)
- Fixed left
- Contains:
  - Dashboard (active indicator)
  - Reports
  - Upload ECG
  - Settings (optional)
- Icons + labels
- Hover states
- Active state highlighting

#### Main Content Area
- Left margin: 256px (for sidebar)
- Top padding: 64px (for navbar)
- Padding: 32px
- Max width: 1400px, centered

#### Dashboard Cards
- Stats cards: 3-column grid
  - Total Reports
  - Recent Reports (last 7 days)
  - Abnormalities Detected
- Card design:
  - White background
  - Subtle shadow
  - Rounded corners (12px)
  - Icon + number + label
  - Hover effect

#### Reports Table
- Modern data table
- Sortable columns
- Search/filter bar
- Pagination
- Row hover states
- Status badges (Normal/Abnormal)
- Action buttons (View, Download PDF)

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  NavBar (Fixed Top)                            │
│  [Logo] [Facility Name]        [User Menu]     │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SideNav  │  Main Content Area                  │
│          │  ┌──────────────────────────────┐   │
│ [Dashboard] │  Stats Cards (3 columns)     │   │
│ [Reports]   │  ┌────┐ ┌────┐ ┌────┐      │   │
│ [Upload]    │  │    │ │    │ │    │      │   │
│ [Settings]  │  └────┘ └────┘ └────┘      │   │
│          │  ┌──────────────────────────────┐   │
│          │  │  Reports Table                │   │
│          │  │  [Search] [Filter]            │   │
│          │  │  ┌────────────────────────┐  │   │
│          │  │  │ Table rows...           │  │   │
│          │  │  └────────────────────────┘  │   │
│          │  │  [Pagination]                │   │
│          │  └──────────────────────────────┘   │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Interactive Elements

#### Buttons
- Primary: Blue background, white text, rounded
- Secondary: White background, blue border, blue text
- Danger: Red background, white text
- Icon buttons: Circular, hover effect

#### Cards
- Elevation: 0px → 4px on hover
- Border radius: 12px
- Padding: 24px
- Transition: 200ms ease

#### Table
- Striped rows (alternating background)
- Hover highlight
- Clickable rows (navigate to detail)
- Status badges with colors

### Responsive Design
- Desktop: Full sidebar + navbar
- Tablet: Collapsible sidebar
- Mobile: Hamburger menu, sidebar overlay

### Icons
- Use Lucide React or similar
- Consistent size: 20px
- Stroke width: 2px

### Animations
- Smooth transitions (200-300ms)
- Fade in on load
- Hover effects
- Loading states

## Implementation Plan

1. Create shared layout component (NavBar + SideNav)
2. Create modern design system (colors, typography)
3. Redesign FacilityDashboard with new layout
4. Add icons and visual polish
5. Implement responsive behavior

