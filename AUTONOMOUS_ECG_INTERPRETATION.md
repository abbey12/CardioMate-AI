# Advanced Autonomous ECG Interpretation Framework

## Overview
CardioMate AI now incorporates an advanced autonomous ECG interpretation framework designed for clinical use and autonomous triage. The system can detect subtle patterns, prioritize patient risk, and provide actionable recommendations suitable for autonomous clinical decision-making.

## Core Capabilities

### 1. Comprehensive STEMI Detection
- **Classic Patterns**: Anterior (V1-V4), Inferior (II, III, aVF), Lateral (I, aVL, V5-V6)
- **Posterior STEMI**: Detection via V1-V3 reciprocal changes (tall R waves, ST depression) or V7-V9 leads
- **Right Ventricular STEMI**: Detection via V4R or right-sided leads
- **High Lateral STEMI**: Detection of D1 branch occlusion ("African Pattern")
- **Subtle STEMI**: Identification of patterns even when ST elevation is small (<2mm) and noncontiguous
- **Context Integration**: Integrates reciprocal changes, conduction abnormalities, and voltage context

### 2. Comprehensive Abnormality Detection
- LVH with strain
- Conduction abnormalities (First-degree AV block, LBBB, RBBB, AF, atrial flutter)
- STEMI mimics (Pericarditis, tamponade, tumor invasion, myopericarditis, early repolarization)
- High sensitivity detection - does not miss subtle or noncontiguous patterns

### 3. Subtle/Noncontiguous ST Elevation Interpretation
- Identifies patterns even when ST elevation is small (<2mm)
- Detects noncontiguous ST elevations
- Integrates reciprocal changes, conduction abnormalities, and voltage context
- Provides appropriate confidence levels for subtle findings

### 4. Risk Prioritization (Autonomous Triage)
- **Life-Saving**: Immediate life-threatening conditions (STEMI, dangerous arrhythmias)
- **Time-Critical**: Conditions requiring urgent evaluation (unstable rhythms, significant abnormalities)
- **Routine**: Non-urgent findings requiring follow-up
- Priority level included in clinical impression

### 5. Rhythm Variation Adaptation
- Correctly interprets ECG in sinus rhythm, atrial fibrillation, or other irregular rhythms
- Adjusts ST-segment interpretation based on underlying rhythm
- Adjusts QTc calculation for irregular rhythms (uses longest QT interval)
- Adjusts heart rate assessment (average vs instantaneous for irregular rhythms)
- Accounts for rate-related changes in ST segments and T waves

### 6. Population-Specific Variations
- Adapts thresholds for LVH, ST elevation, and voltage based on population context
- Considers African cohort patterns:
  - Higher baseline voltage
  - Different ST elevation thresholds
  - Hypertensive ECG patterns common in African populations
- Adjusts interpretation thresholds when patient context suggests specific population characteristics

### 7. Enhanced Confidence Scoring
- **High**: Clear, classic ECG pattern with no conflicting features, territorial consistency confirmed
- **Moderate**: Overlapping features or partial criteria met, subtle findings, or potential mimics
- **Low**: Nonspecific or conflicting findings, possible artifact, or diagnostic uncertainty
- For subtle ST elevations (<2mm) or noncontiguous patterns, defaults to "Moderate" or "Low" confidence
- When confidence is low, recommends confirmatory imaging or additional leads (V7-V9, V4R)

### 8. Autonomous Reporting Structure
- **Summary Diagnosis**: With location specification (anterior, inferior, lateral, posterior, RV, high lateral)
- **Key Supporting Evidence**: Detailed in decisionExplanations
- **Important Negatives**: What is NOT present
- **Differential Diagnosis**: When appropriate, in recommendations
- **Priority Level**: Life-Saving/Time-Critical/Routine
- **Actionable Recommendations**: Immediate steps (PCI/cath lab, echo, imaging, follow-up)
- **Confirmatory Tests**: Suggested when confidence is low

### 9. Safety Override Mechanism
- If there is ANY uncertainty about a potentially life-threatening finding:
  - Escalates to human review recommendation
  - Provides clear guidance for urgent action
  - Never hides ambiguous findings
  - Explicitly states limitations

## Actionable Recommendations

The system provides specific, actionable recommendations based on findings:

### STEMI Detection
- **Recommendation**: "PCI / cath lab activation"
- **Priority**: Life-Saving
- **Action**: Immediate intervention required

### Cardiac Tamponade
- **Recommendation**: "Bedside echo + pericardiocentesis"
- **Priority**: Life-Saving
- **Action**: Immediate intervention required

### STEMI Mimics
- **Recommendation**: "Imaging confirmation / follow-up"
- **Priority**: Time-Critical or Routine (depending on findings)
- **Action**: Confirmatory testing before intervention

### Low Confidence Findings
- **Recommendation**: "Confirmatory imaging or additional leads (V7-V9, V4R)"
- **Priority**: Time-Critical
- **Action**: Additional testing before final diagnosis

## Enhanced Clinical Reasoning Steps

### STEP 1: IDENTIFY PATTERNS (COMPREHENSIVE)
- Identifies ALL ECG abnormalities including:
  - Classic, posterior, RV, and high lateral STEMI
  - Subtle or noncontiguous ST elevations
  - LVH with strain
  - Conduction abnormalities
  - STEMI mimics
- Adjusts measurements based on underlying rhythm

### STEP 2: TERRITORIAL CONSISTENCY CHECK (ENHANCED)
- Assesses for subtle or noncontiguous ST elevations (<2mm)
- Checks for posterior STEMI (V1-V3 reciprocal changes)
- Checks for RV involvement (V4R or right-sided leads)
- Checks for high lateral involvement (I, aVL "African Pattern")
- Integrates reciprocal changes, conduction abnormalities, and voltage context

### STEP 3: STEMI VS STEMI MIMIC ANALYSIS (COMPREHENSIVE)
- Evaluates for ALL mimics:
  - Pericarditis (PR-segment depression, diffuse ST elevation)
  - Cardiac tamponade (electrical alternans, low voltage, tachycardia)
  - Tumor invasion (low voltage, conduction abnormalities)
  - Myopericarditis (diffuse changes, PR depression)
  - LVH with strain
  - Hypertrophic cardiomyopathy
  - Early repolarization
- For subtle ST elevations (<2mm), considers mimics more strongly

### STEP 5: CONFIDENCE CALIBRATION (ENHANCED)
- For subtle ST elevations (<2mm) or noncontiguous patterns, defaults to "Moderate" or "Low" confidence
- When confidence is low, recommends confirmatory imaging or additional leads
- Never assigns "High confidence" for atypical or questionable findings

### STEP 6: CLINICAL CONTEXT INTEGRATION (ENHANCED)
- Population-specific considerations (African cohorts, hypertensive patterns)
- Rhythm-specific interpretations (AF, irregular rhythms)
- Age and medication adjustments

### STEP 8: OUTPUT FORMAT (AUTONOMOUS REPORTING)
- Includes priority classification (Life-Saving/Time-Critical/Routine)
- Provides actionable next steps
- Suggests confirmatory tests when needed
- Recommends human review when uncertainty exists

## Output Structure

### Clinical Impression
- Summary diagnosis with location specification
- Territorial consistency assessment
- STEMI mimic considerations
- **Priority level**: Life-Saving, Time-Critical, or Routine
- Rhythm-specific considerations

### Recommendations
- Differential diagnoses (especially for STEMI mimics or LVH phenotypes)
- **Immediate actionable steps**:
  - PCI/cath lab activation (for STEMI)
  - Bedside echo + pericardiocentesis (for tamponade)
  - Imaging confirmation (for mimics)
  - Follow-up (for routine findings)
- Confirmatory tests (V7-V9, V4R, imaging) when confidence is low
- Human review recommendation when uncertainty exists about life-threatening findings

### Abnormalities
- All findings including:
  - Territorial consistency flags
  - Mimic considerations
  - Subtle or noncontiguous patterns
  - Posterior, RV, or high lateral involvement if detected

### Decision Explanations
- Finding with safe clinical language
- Evidence including assessment of subtle patterns, reciprocal changes, and rhythm context
- Confidence level (High/Medium/Low)
- Normal range and quantitative deviation

## Safety Features

1. **High Sensitivity Detection**: Detects all emergencies including subtle patterns
2. **Risk Prioritization**: Autonomous assignment of Life-Saving/Time-Critical/Routine status
3. **Actionable Guidance**: Specific recommendations for immediate actions
4. **Safety Override**: Escalates to human review when uncertainty exists
5. **Conservative Confidence**: Defaults to lower confidence for subtle findings
6. **Population Adaptation**: Adjusts thresholds based on population context
7. **Rhythm Adaptation**: Correctly interprets in all rhythm types

## Use Cases

### Autonomous Triage
- Suitable for emergency department triage
- Provides priority levels for workflow management
- Suggests immediate actions for life-threatening conditions

### Clinical Decision Support
- Supports cardiologists with comprehensive analysis
- Provides differential diagnoses
- Suggests confirmatory tests when needed

### Population-Specific Interpretation
- Adapts to African cohort patterns
- Considers hypertensive ECG patterns
- Adjusts thresholds based on population context

## Technical Implementation

- **File**: `backend/src/services/gemini.ts`
- **Functions Enhanced**:
  - `interpretWithGemini()` - Signal-based interpretation
  - `interpretEcgImageWithGemini()` - Image-based interpretation
- **Backward Compatible**: Existing output schema maintained, enhanced with better content
- **No Breaking Changes**: All existing reports continue to work

## Future Enhancements

1. **Machine Learning Integration**: Use framework outputs to train priority classification models
2. **Feedback Loop**: Track which subtle findings were correctly identified vs. missed
3. **Clinical Validation**: Compare framework outputs with cardiologist interpretations
4. **Pattern Recognition**: Enhance subtle pattern detection with ML
5. **Population-Specific Models**: Develop population-stratified interpretation models
6. **Real-time Monitoring**: Integrate with continuous monitoring systems

## References

- AHA/ACC Clinical Guidelines
- STEMI Detection Protocols (including posterior, RV, high lateral)
- Subtle ECG Pattern Recognition
- Population-Specific ECG Interpretation
- Autonomous Clinical Decision Support Best Practices

