export type EcgSample = {
  t?: number; // seconds (optional)
  v: number; // millivolts (or arbitrary units if device-specific)
};

export type EcgSignal = {
  lead?: string;
  sampleRateHz: number;
  samples: EcgSample[];
};

export type EcgPreprocessSummary = {
  sampleRateHz: number;
  sampleCount: number;
  durationSec: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  rPeakIndices: number[];
  estimatedHeartRateBpm?: number;
};

export type PatientInfo = {
  // Required demographics for clinical interpretation
  name: string;
  age: number; // Patient age in years
  sex: "male" | "female" | "other" | "unknown";
  medicalRecordNumber?: string; // MRN or patient ID
  // Clinical context
  clinicalIndication?: string; // Reason for ECG (chest pain, syncope, routine, etc.)
  medications?: string[]; // Medications that may affect ECG
  // Optional: comparison to prior ECGs
  priorEcgDate?: string; // ISO date string
};

export type EcgStructuredReport = {
  id: string;
  createdAt: string;
  patient?: PatientInfo; // Patient information (if provided)
  patientId?: string; // Patient ID if linked to patient record
  source: {
    filename?: string;
    contentType?: string;
    format: "csv" | "json" | "image";
  };
  // lightweight preview so UI can render without storing large blobs (prototype-friendly)
  signalPreview?: {
    cleaned: number[]; // first N cleaned samples
    normalized: number[]; // first N normalized samples
  };
  imagePreview?: {
    mimeType: string;
    base64: string; // small-ish; prototype only
  };
  measurements: {
    heartRateBpm?: number;
    rhythm?: string;
    prMs?: number;
    qrsMs?: number;
    qtMs?: number;
    qtcMs?: number;
    pAxis?: number; // P-wave axis in degrees
    qrsAxis?: number; // QRS axis in degrees
    tAxis?: number; // T-wave axis in degrees
  };
  abnormalities: string[];
  clinicalImpression: string;
  recommendations?: string[]; // AI-generated recommendations
  decisionExplanations?: Array<{
    finding: string;
    evidence: string;
    confidence?: string;
    normalRange?: string;
    deviation?: string;
  }>; // AI explanations for decisions
  rawAiText?: string;
  model?: string;
  preprocess: EcgPreprocessSummary;
};


