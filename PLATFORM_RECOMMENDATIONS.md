# Multi-Tenant ECG Platform - Recommendations

## Overview

Transform the current prototype into a **multi-tenant SaaS platform** where healthcare facilities can:
- Sign up and manage accounts
- Upload ECGs for their patients
- View reports in a dashboard
- Download PDF reports
- Manage users within their facility

---

## Architecture Recommendations

### 1. **Multi-Tenancy Strategy** ⭐

**Recommended: Database-Level Multi-Tenancy (Row-Level Security)**

**Approach**: Each record includes a `facilityId` (tenant identifier)

**Pros**:
- Simple to implement
- Good performance (single database)
- Easy data isolation
- Cost-effective for MVP

**Cons**:
- Requires careful query filtering
- All tenants share same database

**Alternative**: Schema-per-tenant (more complex, better isolation)

**Implementation**:
```typescript
// Every table includes facilityId
type EcgReport {
  id: string;
  facilityId: string;  // Tenant identifier
  patientId?: string;
  // ... rest of fields
}

type Facility {
  id: string;
  name: string;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
}
```

---

### 2. **Database Choice** ⭐

**Recommended: PostgreSQL**

**Why**:
- Robust relational model for multi-tenancy
- Row-level security (RLS) for data isolation
- JSONB for flexible metadata
- Excellent performance
- ACID compliance
- Free tier available (Supabase, Neon, Railway)

**Schema Overview**:
```sql
-- Facilities (tenants)
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (facility members)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'doctor', 'member'
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ECG Reports
CREATE TABLE ecg_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
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

### 3. **Authentication & Authorization** ⭐

**Recommended Stack**:
- **JWT (JSON Web Tokens)** for stateless auth
- **bcrypt** for password hashing
- **Role-Based Access Control (RBAC)**

**User Roles**:
- **Facility Admin**: Full access to facility, manage users
- **Doctor**: Upload ECGs, view all reports, download PDFs
- **Member**: View assigned reports, limited access

**Implementation**:
```typescript
// JWT Payload
{
  userId: string;
  facilityId: string;
  role: 'admin' | 'doctor' | 'member';
  email: string;
}

// Middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = verifyJWT(token);
  req.user = payload;
  req.facilityId = payload.facilityId;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

---

### 4. **Frontend Architecture** ⭐

**Recommended: Next.js 14+ (App Router)**

**Why**:
- Server-side rendering for SEO
- Built-in API routes
- Excellent auth support (NextAuth.js)
- TypeScript support
- Modern React patterns

**Alternative**: Keep React + Vite, add routing (React Router)

**Structure**:
```
frontend/
  app/
    (auth)/
      login/
      signup/
    (dashboard)/
      dashboard/          # Facility dashboard
      reports/            # List of reports
      reports/[id]/       # Report detail
      upload/             # Upload ECG
      settings/           # Facility settings
      users/              # Manage users (admin only)
```

---

### 5. **Key Features to Implement**

#### Phase 1: Core Platform (MVP) ✅
1. **Facility Sign-Up**
   - Email/password registration
   - Facility name, admin user creation
   - Email verification (optional)

2. **Authentication**
   - Login/logout
   - JWT-based sessions
   - Password reset

3. **Dashboard**
   - Overview stats (total reports, recent activity)
   - Recent reports list
   - Quick upload button

4. **Report Management**
   - Upload ECG (existing functionality)
   - View report list (filterable, searchable)
   - View report detail
   - Download PDF

5. **User Management** (Admin only)
   - Invite users to facility
   - Assign roles
   - Remove users

#### Phase 2: Enhanced Features
1. **Patient Management**
   - Create/manage patient records
   - Link reports to patients
   - Patient history view

2. **Advanced Search & Filters**
   - Search by patient name, date, abnormalities
   - Filter by date range, doctor, status

3. **Analytics**
   - Reports over time
   - Most common abnormalities
   - Usage statistics

4. **Notifications**
   - Email alerts for critical findings
   - Report ready notifications

#### Phase 3: Enterprise Features
1. **Subscription Management**
   - Tiered plans (basic/premium/enterprise)
   - Usage limits
   - Billing integration (Stripe)

2. **API Access**
   - REST API for integrations
   - API keys per facility
   - Webhooks

3. **Compliance**
   - HIPAA compliance features
   - Audit logs
   - Data export/deletion

---

### 6. **Tech Stack Summary**

#### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express (or Fastify for better performance)
- **Database**: PostgreSQL (with Prisma ORM or raw SQL)
- **Auth**: JWT + bcrypt
- **File Storage**: Local filesystem (MVP) → S3/Cloud Storage (production)
- **PDF**: Puppeteer (existing)
- **AI**: CardioMate AI (existing)

#### Frontend
- **Framework**: Next.js 14+ (or React + Vite)
- **Styling**: Tailwind CSS (or keep existing CSS)
- **State Management**: React Query / SWR for server state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts or Chart.js (for dashboard)

#### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend)
- **Database**: Supabase / Neon / Railway PostgreSQL
- **Email**: SendGrid / Resend (for notifications)
- **Monitoring**: Sentry (error tracking)

---

### 7. **Data Model**

```typescript
// Core Entities
type Facility {
  id: string;
  name: string;
  email: string;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

type User {
  id: string;
  facilityId: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'member';
  passwordHash: string;
  createdAt: Date;
}

type Patient {
  id: string;
  facilityId: string;
  name: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | 'other';
  medicalRecordNumber?: string;
  createdAt: Date;
}

type EcgReport {
  id: string;
  facilityId: string;
  userId: string;        // Who uploaded it
  patientId?: string;     // Link to patient record
  // ... existing report fields
  createdAt: Date;
}
```

---

### 8. **API Endpoints**

#### Authentication
- `POST /auth/signup` - Facility registration
- `POST /auth/login` - User login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh JWT
- `POST /auth/reset-password` - Password reset

#### Facilities
- `GET /facilities/me` - Get current facility
- `PATCH /facilities/me` - Update facility
- `GET /facilities/me/stats` - Dashboard stats

#### Users (within facility)
- `GET /users` - List facility users (admin only)
- `POST /users` - Invite user (admin only)
- `PATCH /users/:id` - Update user role (admin only)
- `DELETE /users/:id` - Remove user (admin only)

#### Reports
- `GET /reports` - List reports (filtered by facility)
- `POST /reports/upload` - Upload ECG (existing)
- `GET /reports/:id` - Get report detail
- `GET /reports/:id/download` - Download PDF (existing)
- `DELETE /reports/:id` - Delete report

#### Patients (optional)
- `GET /patients` - List patients
- `POST /patients` - Create patient
- `GET /patients/:id` - Get patient with reports
- `PATCH /patients/:id` - Update patient

---

### 9. **Security Considerations**

1. **Data Isolation**
   - Always filter by `facilityId` in queries
   - Use database RLS policies
   - Validate `facilityId` in middleware

2. **Authentication**
   - JWT expiration (15min access, 7d refresh)
   - Secure password hashing (bcrypt, rounds: 12)
   - Rate limiting on auth endpoints

3. **Authorization**
   - Role-based middleware
   - Resource ownership checks
   - API rate limiting per facility

4. **Data Protection**
   - Encrypt sensitive data at rest
   - HTTPS only
   - Input validation (Zod schemas)
   - SQL injection prevention (parameterized queries)

5. **Compliance**
   - HIPAA considerations (if applicable)
   - Audit logging
   - Data retention policies
   - User consent management

---

### 10. **Implementation Phases**

#### Phase 1: Foundation (Week 1-2)
- [ ] Database setup (PostgreSQL + schema)
- [ ] Authentication system (signup, login, JWT)
- [ ] Multi-tenancy middleware
- [ ] Basic facility/user models

#### Phase 2: Core Features (Week 3-4)
- [ ] Dashboard UI
- [ ] Report list view
- [ ] Report detail view
- [ ] Upload functionality (existing, add auth)
- [ ] PDF download (existing, add auth)

#### Phase 3: User Management (Week 5)
- [ ] User invitation system
- [ ] Role management
- [ ] User list/management UI

#### Phase 4: Polish (Week 6)
- [ ] Search & filters
- [ ] Patient management (optional)
- [ ] Analytics dashboard
- [ ] Email notifications

---

### 11. **Migration Strategy**

**From Current Prototype**:
1. Keep existing ECG processing logic
2. Add database layer (replace in-memory store)
3. Add authentication wrapper
4. Add facility context to all operations
5. Migrate frontend to Next.js (or enhance React app)

**Data Migration**:
- No existing data to migrate (prototype uses in-memory)
- Fresh start with new schema

---

### 12. **Recommended Libraries**

#### Backend
- `prisma` - ORM (or `pg` + raw SQL)
- `jsonwebtoken` - JWT handling
- `bcrypt` - Password hashing
- `zod` - Validation (already using)
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers

#### Frontend
- `next-auth` - Authentication (if using Next.js)
- `@tanstack/react-query` - Server state
- `react-hook-form` - Forms
- `zod` - Validation
- `recharts` - Charts for dashboard

---

## Next Steps

1. **Choose Database**: PostgreSQL (Supabase/Neon recommended)
2. **Set up Auth**: JWT + bcrypt
3. **Create Schema**: Facilities, Users, Reports tables
4. **Build Auth Flow**: Signup → Login → Dashboard
5. **Add Multi-Tenancy**: Facility isolation in all queries
6. **Migrate Existing**: Wrap ECG upload/download with auth

Would you like me to start implementing Phase 1 (Foundation)?

