# Patient Management & Longitudinal ECG Tracking - Recommendations

## Executive Summary

This document outlines a comprehensive plan to add patient management capabilities to CardioMate AI, enabling facilities to:
1. Create and manage patient records
2. Link multiple ECG readings to the same patient
3. Track patient progress over time (monitoring improvement)
4. Compare current ECG with prior readings during AI analysis
5. View patient history and trends

---

## 1. Database Schema Design

### 1.1 Patients Table

```sql
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Basic Demographics
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  sex VARCHAR(20) CHECK (sex IN ('male', 'female', 'other', 'unknown')),
  date_of_birth DATE, -- Optional, can calculate age
  
  -- Medical Information
  medical_record_number VARCHAR(100), -- Facility-specific MRN
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT,
  
  -- Clinical Information
  primary_diagnosis TEXT,
  comorbidities TEXT[], -- Array of conditions
  medications TEXT[], -- Current medications
  allergies TEXT[],
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID, -- Could link to facility user if multi-user support added
  
  -- Constraints
  UNIQUE(facility_id, medical_record_number) -- MRN unique per facility
);

CREATE INDEX idx_patients_facility ON patients(facility_id);
CREATE INDEX idx_patients_mrn ON patients(facility_id, medical_record_number);
CREATE INDEX idx_patients_name ON patients(facility_id, name);
```

### 1.2 Update ECG Reports Table

```sql
-- Add patient_id column (nullable for backward compatibility)
ALTER TABLE ecg_reports 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

CREATE INDEX idx_ecg_reports_patient ON ecg_reports(patient_id);
CREATE INDEX idx_ecg_reports_facility_patient ON ecg_reports(facility_id, patient_id);
```

### 1.3 Patient ECG History View (Optional - for performance)

```sql
CREATE VIEW patient_ecg_summary AS
SELECT 
  p.id as patient_id,
  p.facility_id,
  p.name as patient_name,
  COUNT(e.id) as total_ecgs,
  MAX(e.created_at) as last_ecg_date,
  MIN(e.created_at) as first_ecg_date,
  ARRAY_AGG(e.id ORDER BY e.created_at DESC) as ecg_ids
FROM patients p
LEFT JOIN ecg_reports e ON e.patient_id = p.id
GROUP BY p.id, p.facility_id, p.name;
```

---

## 2. Backend API Endpoints

### 2.1 Patient Management Endpoints

```typescript
// GET /facility/patients
// List all patients for the facility (with pagination, search, filters)
// Query params: limit, offset, search, sortBy, sortOrder

// GET /facility/patients/:id
// Get patient details including summary stats

// POST /facility/patients
// Create new patient
// Body: { name, age, sex, medicalRecordNumber, phone, email, address, primaryDiagnosis, comorbidities, medications, allergies }

// PATCH /facility/patients/:id
// Update patient information

// DELETE /facility/patients/:id
// Delete patient (soft delete or hard delete with cascade)

// GET /facility/patients/:id/ecgs
// Get all ECGs for a patient (with pagination)
// Returns: { ecgs: EcgStructuredReport[], total: number }

// GET /facility/patients/:id/ecgs/compare
// Get comparison data for patient's ECGs
// Returns: { comparisons: ECGComparison[] }
```

### 2.2 Enhanced Upload Endpoint

```typescript
// POST /facility/reports/upload
// Enhanced to accept patient_id
// Body: { file, patient_id?, patient? (for new patient creation), sampleRateHz? }
// If patient_id provided, link ECG to existing patient
// If patient object provided without patient_id, create new patient and link
```

### 2.3 Comparison Endpoint

```typescript
// GET /facility/reports/:id/compare
// Compare current ECG with prior ECGs from same patient
// Returns: { 
//   current: EcgStructuredReport,
//   prior: EcgStructuredReport[],
//   comparisons: ComparisonResult[]
// }
```

---

## 3. AI Enhancement for Longitudinal Analysis

### 3.1 Enhanced AI Prompt with Prior ECG Context

When analyzing an ECG for a patient with prior readings, include:

```typescript
// In gemini.ts - interpretWithGemini and interpretEcgImageWithGemini

// Add to prompt:
const priorEcgContext = priorEcgs.length > 0 ? `
**PRIOR ECG HISTORY FOR THIS PATIENT:**
${priorEcgs.map((prior, idx) => `
Prior ECG #${idx + 1} (${new Date(prior.createdAt).toLocaleDateString()}):
- Heart Rate: ${prior.measurements.heartRateBpm} bpm
- Rhythm: ${prior.measurements.rhythm}
- Abnormalities: ${prior.abnormalities.join(", ") || "None"}
- Clinical Impression: ${prior.clinicalImpression}
- Key Findings: ${prior.decisionExplanations?.findings || "N/A"}
`).join("\n")}

**COMPARISON REQUIREMENTS:**
1. Compare current ECG findings with prior ECGs
2. Identify any NEW abnormalities not present in prior ECGs
3. Identify any RESOLVED abnormalities (present in prior but not current)
4. Identify any WORSENING findings (e.g., increased ST elevation, new conduction block)
5. Identify any IMPROVING findings (e.g., resolving ST elevation, normalized intervals)
6. Assess overall clinical trajectory (improving, stable, worsening)
7. Provide specific recommendations based on changes observed
8. Flag any critical changes requiring immediate attention

**OUTPUT FORMAT:**
Include a "Comparison with Prior ECGs" section in the report with:
- Summary of changes
- New findings
- Resolved findings
- Worsening findings
- Improving findings
- Clinical trajectory assessment
- Recommendations based on changes
` : "";

// Add priorEcgContext to the prompt
```

### 3.2 Comparison Analysis Function

```typescript
// backend/src/services/comparison.ts

export interface ECGComparison {
  priorEcgId: string;
  priorDate: string;
  currentEcgId: string;
  currentDate: string;
  changes: {
    newFindings: string[];
    resolvedFindings: string[];
    worseningFindings: Array<{ finding: string; prior: string; current: string }>;
    improvingFindings: Array<{ finding: string; prior: string; current: string }>;
    stableFindings: string[];
  };
  trajectory: "improving" | "stable" | "worsening" | "mixed";
  recommendations: string[];
}
```

---

## 4. Frontend Implementation

### 4.1 Patient Management Page

**Route:** `/facility/patients`

**Features:**
- Patient list with search, filters, and pagination
- Create new patient modal/form
- View patient details
- Edit patient information
- Delete patient (with confirmation)
- Quick actions: "Upload ECG for this patient"

**UI Components:**
- PatientList component
- PatientForm component (create/edit)
- PatientDetails modal/page
- PatientCard component

### 4.2 Enhanced Upload Page

**Modifications to `/facility/upload`:**

1. **Patient Selection Section:**
   - Radio buttons: "New Patient" vs "Existing Patient"
   - If "Existing Patient": Searchable dropdown/autocomplete
   - If "New Patient": Patient creation form inline
   - Show "Recent Patients" quick select

2. **Prior ECG Display:**
   - If patient selected and has prior ECGs:
     - Show count: "This patient has X prior ECGs"
     - Show last ECG date
     - Link to view patient history
     - Display key findings from last ECG

3. **Comparison Preview:**
   - After analysis, if prior ECGs exist:
     - Show comparison section
     - Highlight changes
     - Show trajectory indicator

### 4.3 Patient History Page

**Route:** `/facility/patients/:id`

**Features:**
- Patient demographics and medical info
- Timeline view of all ECGs
- ECG cards with key findings
- Comparison view (side-by-side or overlay)
- Trends chart (heart rate, intervals over time)
- Export patient report (all ECGs in one PDF)

**UI Components:**
- PatientProfile component
- ECG Timeline component
- ECG Comparison View component
- Trends Chart component (using Recharts)

### 4.4 Report View Enhancement

**Modifications to `/facility/reports/:id`:**

- Add "Patient" section showing patient info
- Add "Prior ECGs" section with links to previous readings
- Add "Comparison" section if prior ECGs exist
- Add "View Patient History" button

---

## 5. Data Migration Strategy

### 5.1 Migration Script

```sql
-- Step 1: Create patients table (already defined above)

-- Step 2: Migrate existing patient data from ecg_reports.patient_info
INSERT INTO patients (facility_id, name, age, sex, medical_record_number, created_at)
SELECT DISTINCT ON (facility_id, (patient_info->>'name'), (patient_info->>'medicalRecordNumber'))
  facility_id,
  patient_info->>'name' as name,
  (patient_info->>'age')::INTEGER as age,
  patient_info->>'sex' as sex,
  patient_info->>'medicalRecordNumber' as medical_record_number,
  MIN(created_at) as created_at
FROM ecg_reports
WHERE patient_info IS NOT NULL
  AND patient_info->>'name' IS NOT NULL
GROUP BY facility_id, patient_info->>'name', patient_info->>'medicalRecordNumber';

-- Step 3: Link existing ECGs to patients
UPDATE ecg_reports e
SET patient_id = p.id
FROM patients p
WHERE e.facility_id = p.facility_id
  AND e.patient_info->>'name' = p.name
  AND (
    (e.patient_info->>'medicalRecordNumber' IS NULL AND p.medical_record_number IS NULL)
    OR (e.patient_info->>'medicalRecordNumber' = p.medical_record_number)
  )
  AND e.patient_id IS NULL;
```

### 5.2 Backward Compatibility

- Keep `patient_info` JSONB column for backward compatibility
- When creating new ECGs, populate both `patient_id` and `patient_info`
- When querying, prefer `patient_id` but fall back to `patient_info` if needed

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema migration
- [ ] Backend patient CRUD endpoints
- [ ] Basic patient management page
- [ ] Link ECGs to patients during upload

### Phase 2: Core Features (Week 3-4)
- [ ] Patient history page
- [ ] Enhanced upload with patient selection
- [ ] Prior ECG display in upload flow
- [ ] Basic comparison view

### Phase 3: AI Enhancement (Week 5)
- [ ] Enhanced AI prompts with prior ECG context
- [ ] Comparison analysis function
- [ ] Comparison display in reports
- [ ] Trajectory indicators

### Phase 4: Advanced Features (Week 6)
- [ ] Trends visualization (charts)
- [ ] Export patient report (all ECGs)
- [ ] Search and filters for patients
- [ ] Bulk operations

### Phase 5: Polish (Week 7)
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Documentation
- [ ] Testing

---

## 7. UI/UX Recommendations

### 7.1 Patient Selection in Upload Flow

**Option A: Inline Selection (Recommended)**
```
┌─────────────────────────────────────┐
│ Patient Information                 │
├─────────────────────────────────────┤
│ ○ New Patient  ● Existing Patient  │
│                                     │
│ [Search patients...] ▼             │
│ ┌─────────────────────────────────┐ │
│ │ John Doe (MRN: 12345)           │ │
│ │ Last ECG: 2024-01-15            │ │
│ │ Findings: Normal sinus rhythm   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Or create new:                      │
│ Name: [________________]            │
│ Age: [__] Sex: [Male ▼]            │
│ MRN: [________________]            │
└─────────────────────────────────────┘
```

**Option B: Modal Selection**
- Click "Select Patient" button
- Opens modal with search and create options
- Selected patient shown in upload form

### 7.2 Patient History Timeline

```
┌─────────────────────────────────────────────┐
│ Patient: John Doe | MRN: 12345              │
├─────────────────────────────────────────────┤
│                                             │
│ 2024-01-20 14:30  [ECG #3]                 │
│ ┌─────────────────────────────────────┐    │
│ │ HR: 72 bpm | Normal Sinus Rhythm    │    │
│ │ Status: Improving                    │    │
│ │ [View Report] [Compare]              │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ 2024-01-15 10:15  [ECG #2]                 │
│ ┌─────────────────────────────────────┐    │
│ │ HR: 85 bpm | Sinus Tachycardia      │    │
│ │ Status: Stable                      │    │
│ │ [View Report] [Compare]              │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ 2024-01-10 09:00  [ECG #1]                 │
│ ┌─────────────────────────────────────┐    │
│ │ HR: 95 bpm | Atrial Fibrillation    │    │
│ │ Status: Baseline                    │    │
│ │ [View Report] [Compare]              │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 7.3 Comparison View

**Side-by-Side:**
```
┌──────────────────┬──────────────────┐
│ Prior ECG        │ Current ECG      │
│ 2024-01-15       │ 2024-01-20       │
├──────────────────┼──────────────────┤
│ HR: 85 bpm       │ HR: 72 bpm       │
│ Rhythm: ST       │ Rhythm: NSR      │
│ ST Elevation: +  │ ST Elevation: -  │
│                  │                  │
│ [Changes]        │                  │
│ ✓ HR decreased   │                  │
│ ✓ Rhythm improved│                  │
│ ✓ ST normalized  │                  │
│                  │                  │
│ Trajectory:      │                  │
│ ⬆ Improving      │                  │
└──────────────────┴──────────────────┘
```

---

## 8. Technical Considerations

### 8.1 Performance

- **Indexing:** Ensure proper indexes on `patient_id`, `facility_id`, `created_at`
- **Pagination:** Always paginate patient lists and ECG history
- **Caching:** Cache patient lookup for upload flow
- **Lazy Loading:** Load prior ECGs only when needed

### 8.2 Data Privacy

- **Facility Isolation:** Ensure patients are scoped to facilities
- **Access Control:** Only facility users can access their patients
- **Audit Logging:** Log patient creation, updates, deletions
- **Data Retention:** Respect patient data retention policies

### 8.3 Error Handling

- **Patient Not Found:** Graceful handling when patient_id invalid
- **Duplicate MRN:** Validation and clear error messages
- **Orphaned ECGs:** Handle cases where patient deleted but ECGs remain
- **Migration Errors:** Rollback strategy for failed migrations

---

## 9. Success Metrics

- **Adoption Rate:** % of facilities using patient management
- **Patient Records:** Average patients per facility
- **Longitudinal Tracking:** % of ECGs linked to existing patients
- **Comparison Usage:** % of reports with prior ECG comparisons
- **User Satisfaction:** Feedback on patient management features

---

## 10. Future Enhancements

1. **Patient Groups:** Organize patients by diagnosis, ward, etc.
2. **Alerts:** Notify on significant ECG changes
3. **Templates:** Pre-filled patient forms for common cases
4. **Integration:** Import patients from EMR systems
5. **Multi-user:** Track which user created/updated patient
6. **Patient Notes:** Add clinical notes separate from ECG reports
7. **Appointments:** Schedule follow-up ECGs
8. **Export:** Export patient data for EMR integration

---

## Recommendation Summary

**Priority Features:**
1. ✅ Patient CRUD operations
2. ✅ Link ECGs to patients
3. ✅ Patient selection in upload flow
4. ✅ Patient history view
5. ✅ AI comparison with prior ECGs
6. ✅ Comparison display in reports

**Implementation Approach:**
- Start with Phase 1 (Foundation) - get basic patient management working
- Then Phase 2 (Core Features) - enable longitudinal tracking
- Finally Phase 3 (AI Enhancement) - add intelligent comparison

**Key Design Decisions:**
- Use `patient_id` foreign key (normalized) + keep `patient_info` JSONB (denormalized for performance)
- Patient MRN unique per facility (not globally)
- Soft delete patients (or cascade delete with confirmation)
- Always show patient context in ECG reports

This system will transform CardioMate AI from a single-ECG analysis tool into a comprehensive patient monitoring platform, significantly increasing its clinical value and user retention.

