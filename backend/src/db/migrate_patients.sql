-- Patient Management Migration
-- Run this to add patient management capabilities

-- Step 1: Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Basic Demographics
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  sex VARCHAR(20) CHECK (sex IN ('male', 'female', 'other', 'unknown')),
  date_of_birth DATE,
  
  -- Medical Information
  medical_record_number VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT,
  
  -- Clinical Information
  primary_diagnosis TEXT,
  comorbidities TEXT[],
  medications TEXT[],
  allergies TEXT[],
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(facility_id, medical_record_number) -- MRN unique per facility (nulls allowed)
);

-- Step 2: Add patient_id to ecg_reports (nullable for backward compatibility)
ALTER TABLE ecg_reports 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_facility ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(facility_id, medical_record_number) WHERE medical_record_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(facility_id, name);
CREATE INDEX IF NOT EXISTS idx_ecg_reports_patient ON ecg_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_ecg_reports_facility_patient ON ecg_reports(facility_id, patient_id);

-- Step 4: Migrate existing patient data from ecg_reports.patient_info to patients table
-- This creates patient records from existing ECG reports
INSERT INTO patients (facility_id, name, age, sex, medical_record_number, created_at)
SELECT DISTINCT ON (facility_id, (patient_info->>'name'), COALESCE(patient_info->>'medicalRecordNumber', ''))
  facility_id,
  patient_info->>'name' as name,
  CASE 
    WHEN patient_info->>'age' ~ '^[0-9]+$' THEN (patient_info->>'age')::INTEGER
    ELSE NULL
  END as age,
  COALESCE(patient_info->>'sex', 'unknown') as sex,
  NULLIF(patient_info->>'medicalRecordNumber', '') as medical_record_number,
  MIN(created_at) as created_at
FROM ecg_reports
WHERE patient_info IS NOT NULL
  AND patient_info->>'name' IS NOT NULL
  AND patient_info->>'name' != ''
GROUP BY facility_id, patient_info->>'name', COALESCE(patient_info->>'medicalRecordNumber', ''), patient_info->>'age', patient_info->>'sex', patient_info->>'medicalRecordNumber'
ON CONFLICT DO NOTHING;

-- Step 5: Link existing ECGs to patients
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

