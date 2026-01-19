-- Migration script to link existing ECGs to patients
-- This script should be run after the patients table migration
-- It links ECGs that have patient_info matching existing patients

-- Step 1: Link ECGs to patients based on name and MRN match
UPDATE ecg_reports e
SET patient_id = p.id
FROM patients p
WHERE e.facility_id = p.facility_id
  AND e.patient_info IS NOT NULL
  AND e.patient_info->>'name' IS NOT NULL
  AND e.patient_info->>'name' = p.name
  AND (
    -- Match by MRN if both have it
    (e.patient_info->>'medicalRecordNumber' IS NOT NULL 
     AND p.medical_record_number IS NOT NULL
     AND e.patient_info->>'medicalRecordNumber' = p.medical_record_number)
    OR
    -- Match by name only if MRN is null in both
    (e.patient_info->>'medicalRecordNumber' IS NULL 
     AND p.medical_record_number IS NULL)
  )
  AND e.patient_id IS NULL;

-- Step 2: Create patients for ECGs that don't match existing patients
-- (Only if patient_info has name)
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
  AND patient_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.facility_id = ecg_reports.facility_id
      AND p.name = ecg_reports.patient_info->>'name'
      AND (
        (p.medical_record_number IS NULL AND ecg_reports.patient_info->>'medicalRecordNumber' IS NULL)
        OR (p.medical_record_number = ecg_reports.patient_info->>'medicalRecordNumber')
      )
  )
GROUP BY facility_id, patient_info->>'name', COALESCE(patient_info->>'medicalRecordNumber', '')
ON CONFLICT DO NOTHING;

-- Step 3: Link the remaining ECGs to newly created patients
UPDATE ecg_reports e
SET patient_id = p.id
FROM patients p
WHERE e.facility_id = p.facility_id
  AND e.patient_info IS NOT NULL
  AND e.patient_info->>'name' IS NOT NULL
  AND e.patient_info->>'name' = p.name
  AND (
    (e.patient_info->>'medicalRecordNumber' IS NULL AND p.medical_record_number IS NULL)
    OR (e.patient_info->>'medicalRecordNumber' = p.medical_record_number)
  )
  AND e.patient_id IS NULL;

-- Step 4: Report summary
SELECT 
  'Migration Summary' as summary,
  (SELECT COUNT(*) FROM ecg_reports WHERE patient_id IS NOT NULL) as linked_ecgs,
  (SELECT COUNT(*) FROM ecg_reports WHERE patient_id IS NULL AND patient_info IS NOT NULL) as unlinked_ecgs,
  (SELECT COUNT(*) FROM patients) as total_patients;

