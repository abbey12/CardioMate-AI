# Simplified Multi-Tenant Platform Plan

## Architecture: Admin + Facility Portals

### Two-Tier System

1. **Admin Portal**
   - Platform administrators
   - Manage facilities (create, view, delete)
   - View all reports across facilities
   - System-wide analytics

2. **Facility Portal**
   - Each facility is a tenant
   - Upload ECGs
   - View their own reports
   - Download PDFs
   - Facility settings

---

## User Types

### Admin Users
- Platform-level administrators
- Can access admin portal
- Can manage all facilities
- Can view all reports

### Facility Users
- Belong to one facility
- Can only access their facility's data
- Can upload ECGs and view reports

---

## Database Schema

```sql
-- Facilities (tenants)
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin users (platform admins)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ECG Reports (facility-scoped)
CREATE TABLE ecg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  patient_info JSONB,
  measurements JSONB,
  abnormalities TEXT[],
  clinical_impression TEXT,
  source_format VARCHAR(50),
  signal_preview JSONB,
  decision_explanations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE ecg_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_isolation ON ecg_reports
  FOR ALL
  USING (facility_id = current_setting('app.current_facility_id')::UUID);
```

---

## Authentication Flow

### Admin Login
- Email + password
- JWT with `role: 'admin'`
- Access to admin portal

### Facility Login
- Facility email + password
- JWT with `role: 'facility'` + `facilityId`
- Access to facility portal (only their data)

---

## API Endpoints

### Admin Routes (`/admin/*`)
- `POST /admin/auth/login` - Admin login
- `GET /admin/facilities` - List all facilities
- `POST /admin/facilities` - Create facility
- `GET /admin/facilities/:id` - Get facility details
- `DELETE /admin/facilities/:id` - Delete facility
- `GET /admin/reports` - View all reports (all facilities)
- `GET /admin/stats` - Platform-wide statistics

### Facility Routes (`/facility/*`)
- `POST /facility/auth/login` - Facility login
- `GET /facility/dashboard` - Facility dashboard
- `GET /facility/reports` - List facility's reports
- `POST /facility/reports/upload` - Upload ECG (existing)
- `GET /facility/reports/:id` - Get report detail
- `GET /facility/reports/:id/download` - Download PDF
- `GET /facility/settings` - Facility settings
- `PATCH /facility/settings` - Update facility info

---

## Frontend Structure

```
frontend/
  app/
    (admin)/
      login/
      dashboard/
      facilities/
      facilities/[id]/
      reports/
    (facility)/
      login/
      dashboard/
      reports/
      reports/[id]/
      upload/
      settings/
```

---

## Implementation Plan

### Phase 1: Database + Auth (Week 1)
1. Set up PostgreSQL
2. Create schema (facilities, admins, reports)
3. Admin authentication
4. Facility authentication
5. JWT middleware with role checking

### Phase 2: Admin Portal (Week 2)
1. Admin login page
2. Admin dashboard
3. Facility management (CRUD)
4. View all reports

### Phase 3: Facility Portal (Week 3)
1. Facility login page
2. Facility dashboard
3. Report list view
4. Report detail view
5. Upload ECG (existing, add auth)
6. Download PDF (existing, add auth)
7. Facility settings

### Phase 4: Polish (Week 4)
1. Search & filters
2. Analytics/statistics
3. UI polish
4. Error handling

---

## Tech Stack

- **Database**: PostgreSQL (Supabase/Neon)
- **Backend**: Node.js + Express + TypeScript
- **Auth**: JWT + bcrypt
- **Frontend**: Next.js 14+ (or React + Router)
- **ORM**: Prisma (or raw SQL with pg)

---

## Security

1. **Data Isolation**: All queries filter by `facilityId`
2. **Role-Based Access**: Admin vs Facility middleware
3. **JWT Expiration**: 15min access, 7d refresh
4. **Password Security**: bcrypt with 12 rounds
5. **Rate Limiting**: Per endpoint

---

## Next Steps

Start with Phase 1: Database setup + Authentication

