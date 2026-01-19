import type { PatientInfo } from "../types/ecg.js";

type EcgMeasurements = {
  heartRateBpm?: number;
  rhythm?: string;
  prMs?: number;
  qrsMs?: number;
  qtMs?: number;
  qtcMs?: number;
};

type ValidationResult = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  corrected?: Partial<EcgMeasurements>;
};

/**
 * Validate ECG measurements against physiological limits and consistency checks
 */
export function validateEcgMeasurements(
  measurements: EcgMeasurements,
  patient?: PatientInfo
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const corrected: Partial<EcgMeasurements> = { ...measurements };

  // Age-specific normal ranges
  const age = patient?.age ?? 50; // Default to middle age if unknown
  const isPediatric = age < 18;
  const isElderly = age >= 65;

  // Heart rate validation
  if (measurements.heartRateBpm !== undefined && measurements.heartRateBpm !== null) {
    if (measurements.heartRateBpm < 20 || measurements.heartRateBpm > 300) {
      errors.push(`Heart rate ${measurements.heartRateBpm} bpm is outside physiological range (20-300)`);
    } else if (measurements.heartRateBpm < 40) {
      warnings.push(`Bradycardia: Heart rate ${measurements.heartRateBpm} bpm is very low`);
    } else if (measurements.heartRateBpm > 150) {
      warnings.push(`Tachycardia: Heart rate ${measurements.heartRateBpm} bpm is very high`);
    }
  }

  // PR interval validation (normal: 120-200ms, age-dependent)
  if (measurements.prMs !== undefined && measurements.prMs !== null) {
    const prNormalMin = isPediatric ? 90 : 120;
    const prNormalMax = isElderly ? 220 : 200;
    
    if (measurements.prMs < 80 || measurements.prMs > 300) {
      errors.push(`PR interval ${measurements.prMs} ms is outside physiological range (80-300)`);
    } else if (measurements.prMs < prNormalMin) {
      warnings.push(`Short PR interval: ${measurements.prMs} ms (normal: ${prNormalMin}-${prNormalMax} ms)`);
    } else if (measurements.prMs > prNormalMax) {
      warnings.push(`Prolonged PR interval: ${measurements.prMs} ms (normal: ${prNormalMin}-${prNormalMax} ms)`);
    }
  }

  // QRS duration validation (normal: 80-120ms, <100ms ideal)
  if (measurements.qrsMs !== undefined && measurements.qrsMs !== null) {
    if (measurements.qrsMs < 40 || measurements.qrsMs > 300) {
      errors.push(`QRS duration ${measurements.qrsMs} ms is outside physiological range (40-300)`);
    } else if (measurements.qrsMs > 120) {
      warnings.push(`Wide QRS: ${measurements.qrsMs} ms (normal: 80-120 ms) - possible bundle branch block`);
    } else if (measurements.qrsMs < 60) {
      warnings.push(`Narrow QRS: ${measurements.qrsMs} ms (normal: 80-120 ms)`);
    }
  }

  // QT interval validation (age and sex dependent)
  if (measurements.qtMs !== undefined && measurements.qtMs !== null) {
    const qtNormalMin = isPediatric ? 280 : 350;
    const qtNormalMax = isPediatric ? 440 : 450;
    
    if (measurements.qtMs < 200 || measurements.qtMs > 600) {
      errors.push(`QT interval ${measurements.qtMs} ms is outside physiological range (200-600)`);
    } else if (measurements.qtMs < qtNormalMin) {
      warnings.push(`Short QT interval: ${measurements.qtMs} ms (normal: ${qtNormalMin}-${qtNormalMax} ms)`);
    } else if (measurements.qtMs > qtNormalMax) {
      warnings.push(`Prolonged QT interval: ${measurements.qtMs} ms (normal: ${qtNormalMin}-${qtNormalMax} ms)`);
    }
  }

  // QTc validation (Bazett's formula: QTc = QT / sqrt(RR))
  if (measurements.qtcMs !== undefined && measurements.qtcMs !== null) {
    // Normal QTc: <440ms (males), <460ms (females), <450ms (pediatric)
    const qtcNormalMax = isPediatric ? 450 : patient?.sex === "female" ? 460 : 440;
    
    if (measurements.qtcMs < 300 || measurements.qtcMs > 600) {
      errors.push(`QTc ${measurements.qtcMs} ms is outside physiological range (300-600)`);
    } else if (measurements.qtcMs > qtcNormalMax) {
      warnings.push(`Prolonged QTc: ${measurements.qtcMs} ms (normal: <${qtcNormalMax} ms)`);
    } else if (measurements.qtcMs > 500) {
      errors.push(`Severely prolonged QTc: ${measurements.qtcMs} ms - risk of torsades de pointes`);
    }
  }

  // Consistency checks
  if (measurements.qtMs && measurements.qrsMs) {
    if (measurements.qtMs < measurements.qrsMs) {
      errors.push(`QT interval (${measurements.qtMs} ms) cannot be shorter than QRS duration (${measurements.qrsMs} ms)`);
    }
  }

  if (measurements.prMs && measurements.qrsMs) {
    if (measurements.prMs < measurements.qrsMs) {
      warnings.push(`PR interval (${measurements.prMs} ms) is shorter than QRS duration (${measurements.qrsMs} ms) - unusual`);
    }
  }

  // Heart rate and rhythm consistency
  if (measurements.rhythm && measurements.heartRateBpm) {
    const hr = measurements.heartRateBpm;
    if (measurements.rhythm.toLowerCase().includes("bradycardia") && hr >= 60) {
      warnings.push(`Rhythm indicates bradycardia but heart rate (${hr} bpm) is normal`);
    }
    if (measurements.rhythm.toLowerCase().includes("tachycardia") && hr <= 100) {
      warnings.push(`Rhythm indicates tachycardia but heart rate (${hr} bpm) is normal`);
    }
    if (measurements.rhythm.toLowerCase().includes("sinus") && (hr < 50 || hr > 100)) {
      warnings.push(`Sinus rhythm typically has HR 50-100 bpm, but measured ${hr} bpm`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    corrected: errors.length > 0 ? corrected : undefined
  };
}

