# Phase 3 Implementation: AI Enhancement with Prior ECG Comparison

## Overview
Phase 3 enhances the AI interpretation system to include prior ECG context for longitudinal comparison and trajectory assessment.

## Changes Made

### 1. Backend - Gemini Service (`backend/src/services/gemini.ts`)

#### Updated Function Signatures
- `interpretWithGemini()`: Added `priorEcgs` parameter
- `interpretEcgImageWithGemini()`: Added `priorEcgs` parameter

#### Prior ECG Context in Prompts
Both functions now include prior ECG history when available:
- Lists all prior ECGs with key measurements (HR, rhythm, intervals, abnormalities)
- Includes clinical impressions from prior ECGs
- Provides comparison requirements:
  1. Compare current vs prior findings
  2. Identify NEW abnormalities
  3. Identify RESOLVED abnormalities
  4. Identify WORSENING findings
  5. Identify IMPROVING findings
  6. Assess clinical trajectory (Improving/Stable/Worsening/Mixed)
  7. Provide recommendations based on changes
  8. Flag critical changes requiring immediate attention

#### Output Requirements
AI is instructed to:
- Include "Comparison with Prior ECGs" section in clinical impression
- Clearly state NEW, RESOLVED, WORSENING, IMPROVING findings
- Provide trajectory assessment
- Include specific recommendations based on changes

### 2. Backend - Upload Endpoint (`backend/src/routes/facility.ts`)

#### Prior ECG Fetching
- When `patientId` is provided, the endpoint now:
  1. Fetches the last 5 prior ECGs for the patient
  2. Extracts key data (measurements, abnormalities, clinical impression)
  3. Passes prior ECGs to AI functions
  4. Handles errors gracefully (continues without prior ECGs if fetch fails)

#### Updated AI Calls
- Image-based analysis: `interpretEcgImageWithGemini()` now receives `priorEcgs`
- Signal-based analysis: `interpretWithGemini()` now receives `priorEcgs`

## Benefits

1. **Longitudinal Tracking**: AI can now compare current ECG with patient's history
2. **Trajectory Assessment**: Identifies if patient is improving, stable, or worsening
3. **Change Detection**: Highlights new, resolved, worsening, and improving findings
4. **Clinical Context**: Provides recommendations based on changes over time
5. **Safety**: Flags critical changes requiring immediate attention

## Example AI Output

When prior ECGs exist, the AI will now include in the clinical impression:

```
Comparison with Prior ECGs:
- NEW findings: Atrial fibrillation (not present in prior ECGs)
- RESOLVED findings: ST elevation in leads II, III, aVF has resolved
- WORSENING findings: Heart rate increased from 72 to 95 bpm
- IMPROVING findings: QTc interval normalized from 480ms to 420ms
- Clinical trajectory: Mixed (some findings improving, others worsening)

Recommendations:
- New atrial fibrillation detected - initiate anticoagulation evaluation
- ST elevation resolution suggests successful reperfusion - continue monitoring
- Increased heart rate may indicate decompensation - assess volume status
```

## Testing

To test Phase 3:
1. Create a patient
2. Upload first ECG (baseline)
3. Upload second ECG for same patient
4. Check clinical impression for comparison section
5. Verify trajectory assessment is included

## Next Steps (Future Enhancements)

- Add comparison visualization component
- Extract structured comparison data for frontend display
- Add trend charts for key parameters over time
- Implement automated alerts for critical changes

