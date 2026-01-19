import type { EcgPreprocessSummary, EcgSignal } from "../types/ecg.js";

export type SignalQuality = {
  overall: "excellent" | "good" | "fair" | "poor" | "unusable";
  score: number; // 0-100
  issues: string[];
  warnings: string[];
};

/**
 * Assess ECG signal quality before interpretation
 */
export function assessSignalQuality(
  signal: EcgSignal,
  preprocess: EcgPreprocessSummary
): SignalQuality {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Check duration
  if (preprocess.durationSec < 2) {
    issues.push("Signal duration too short (<2 seconds)");
    score -= 30;
  } else if (preprocess.durationSec < 5) {
    warnings.push("Short signal duration (<5 seconds)");
    score -= 10;
  }

  // Check sample rate
  if (preprocess.sampleRateHz < 200) {
    issues.push("Low sample rate (<200 Hz) may affect accuracy");
    score -= 20;
  } else if (preprocess.sampleRateHz < 500) {
    warnings.push("Moderate sample rate (<500 Hz)");
    score -= 5;
  }

  // Check signal amplitude range
  const amplitudeRange = preprocess.max - preprocess.min;
  if (amplitudeRange < 0.1) {
    issues.push("Very low signal amplitude - possible poor contact or artifact");
    score -= 25;
  } else if (amplitudeRange < 0.5) {
    warnings.push("Low signal amplitude");
    score -= 10;
  }

  // Check for excessive noise (high standard deviation relative to mean)
  const cv = preprocess.std / Math.abs(preprocess.mean || 1); // coefficient of variation
  if (cv > 2.0) {
    issues.push("High noise level detected");
    score -= 20;
  } else if (cv > 1.0) {
    warnings.push("Moderate noise level");
    score -= 10;
  }

  // Check R-peak detection
  if (preprocess.rPeakIndices.length < 2) {
    issues.push("Insufficient R-peaks detected - cannot determine rhythm");
    score -= 30;
  } else {
    // Check R-R interval variability (for rhythm assessment)
    const rrIntervals: number[] = [];
    for (let i = 1; i < preprocess.rPeakIndices.length; i++) {
      const rr = (preprocess.rPeakIndices[i] - preprocess.rPeakIndices[i - 1]) / preprocess.sampleRateHz;
      rrIntervals.push(rr);
    }
    if (rrIntervals.length > 1) {
      const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
      const stdRR = Math.sqrt(
        rrIntervals.reduce((acc, rr) => acc + Math.pow(rr - meanRR, 2), 0) / rrIntervals.length
      );
      const cvRR = stdRR / meanRR;
      if (cvRR > 0.2) {
        warnings.push("High R-R interval variability - possible arrhythmia or artifact");
        score -= 5;
      }
    }
  }

  // Check estimated heart rate plausibility
  if (preprocess.estimatedHeartRateBpm) {
    if (preprocess.estimatedHeartRateBpm < 30 || preprocess.estimatedHeartRateBpm > 250) {
      issues.push(`Implausible heart rate: ${preprocess.estimatedHeartRateBpm} bpm`);
      score -= 20;
    } else if (preprocess.estimatedHeartRateBpm < 40 || preprocess.estimatedHeartRateBpm > 200) {
      warnings.push(`Unusual heart rate: ${preprocess.estimatedHeartRateBpm} bpm`);
      score -= 5;
    }
  }

  // Determine overall quality
  let overall: SignalQuality["overall"];
  if (score >= 85) {
    overall = "excellent";
  } else if (score >= 70) {
    overall = "good";
  } else if (score >= 50) {
    overall = "fair";
  } else if (score >= 30) {
    overall = "poor";
  } else {
    overall = "unusable";
  }

  return { overall, score, issues, warnings };
}

/**
 * Extract enhanced features from ECG signal for better AI interpretation
 */
export function extractEnhancedFeatures(
  signal: EcgSignal,
  preprocess: EcgPreprocessSummary
): {
  rPeakIndices: number[];
  rrIntervals: number[];
  rrMean: number;
  rrStd: number;
  rrMin: number;
  rrMax: number;
  heartRateVariability: number;
  signalSegments: {
    start: number;
    end: number;
    samples: number[];
  }[];
  statisticalFeatures: {
    mean: number;
    std: number;
    min: number;
    max: number;
    range: number;
    skewness: number;
    kurtosis: number;
  };
} {
  const rPeakIndices = preprocess.rPeakIndices;
  
  // Calculate R-R intervals
  const rrIntervals: number[] = [];
  for (let i = 1; i < rPeakIndices.length; i++) {
    const rr = (rPeakIndices[i] - rPeakIndices[i - 1]) / preprocess.sampleRateHz;
    rrIntervals.push(rr);
  }

  const rrMean = rrIntervals.length > 0
    ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length
    : 0;
  const rrStd = rrIntervals.length > 1
    ? Math.sqrt(
        rrIntervals.reduce((acc, rr) => acc + Math.pow(rr - rrMean, 2), 0) / rrIntervals.length
      )
    : 0;
  const rrMin = rrIntervals.length > 0 ? Math.min(...rrIntervals) : 0;
  const rrMax = rrIntervals.length > 0 ? Math.max(...rrIntervals) : 0;
  const heartRateVariability = rrStd / rrMean; // coefficient of variation

  // Extract signal segments around R-peaks (for QRS analysis)
  const segmentDuration = 0.4; // 400ms around each R-peak
  const segmentSamples = Math.floor(segmentDuration * preprocess.sampleRateHz);
  const signalSegments = rPeakIndices.slice(0, 10).map((rPeak) => {
    const start = Math.max(0, rPeak - segmentSamples / 2);
    const end = Math.min(signal.samples.length - 1, rPeak + segmentSamples / 2);
    return {
      start: Math.floor(start),
      end: Math.floor(end),
      samples: signal.samples.slice(Math.floor(start), Math.floor(end) + 1).map((s) => s.v)
    };
  });

  // Calculate statistical features
  const values = signal.samples.map((s) => s.v);
  const mean = preprocess.mean;
  const std = preprocess.std;
  const min = preprocess.min;
  const max = preprocess.max;
  const range = max - min;

  // Skewness (third moment)
  const skewness =
    values.length > 0
      ? values.reduce((acc, v) => acc + Math.pow((v - mean) / (std || 1), 3), 0) / values.length
      : 0;

  // Kurtosis (fourth moment)
  const kurtosis =
    values.length > 0
      ? values.reduce((acc, v) => acc + Math.pow((v - mean) / (std || 1), 4), 0) / values.length
      : 0;

  return {
    rPeakIndices,
    rrIntervals,
    rrMean,
    rrStd,
    rrMin,
    rrMax,
    heartRateVariability,
    signalSegments,
    statisticalFeatures: {
      mean,
      std,
      min,
      max,
      range,
      skewness,
      kurtosis
    }
  };
}

