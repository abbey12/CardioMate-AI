export type PatientInfo = {
  name: string;
  age: number; // Patient age in years
  sex: "male" | "female" | "other" | "unknown";
  medicalRecordNumber?: string;
  clinicalIndication?: string;
  medications?: string[];
  priorEcgDate?: string;
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

export type EcgStructuredReport = {
  id: string;
  createdAt: string;
  patient?: PatientInfo;
  patientId?: string; // Patient ID if linked to patient record
  source: {
    filename?: string;
    contentType?: string;
    format: "csv" | "json" | "image";
  };
  signalPreview?: {
    cleaned: number[];
    normalized: number[];
  };
  imagePreview?: {
    mimeType: string;
    base64: string;
  };
  measurements: {
    heartRateBpm?: number;
    rhythm?: string;
    prMs?: number;
    qrsMs?: number;
    qtMs?: number;
    qtcMs?: number;
    pAxis?: number;
    qrsAxis?: number;
    tAxis?: number;
  };
  abnormalities: string[];
  clinicalImpression: string;
  recommendations?: string[];
  decisionExplanations?: Array<{
    finding: string;
    evidence: string;
    confidence?: string;
    normalRange?: string;
    deviation?: string;
  }>;
  rawAiText?: string;
  model?: string;
  preprocess: EcgPreprocessSummary;
};


