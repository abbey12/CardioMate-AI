export type Patient = {
  id: string;
  facilityId: string;
  name: string;
  age?: number | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  dateOfBirth?: Date | string | null;
  medicalRecordNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  primaryDiagnosis?: string | null;
  comorbidities?: string[] | null;
  medications?: string[] | null;
  allergies?: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CreatePatientData = {
  name: string;
  age?: number | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  dateOfBirth?: string | null;
  medicalRecordNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  primaryDiagnosis?: string | null;
  comorbidities?: string[] | null;
  medications?: string[] | null;
  allergies?: string[] | null;
};

export type UpdatePatientData = Partial<CreatePatientData>;

export type PatientWithStats = Patient & {
  totalEcgs: number;
  lastEcgDate?: Date | string | null;
  firstEcgDate?: Date | string | null;
};

