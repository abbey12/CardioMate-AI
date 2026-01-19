# Clinical Reasoning Framework Integration

## Overview
The CardioMate AI system now incorporates a sophisticated 8-step clinical reasoning framework designed to ensure conservative, accurate, and cardiologist-safe ECG interpretation.

## Framework Components

### STEP 1: IDENTIFY PATTERNS
- Systematic identification of rhythm, rate, axis, and intervals
- Detection of primary ECG abnormalities (ST elevation, LVH, Q waves, conduction blocks)
- Precise measurement calculation (HR, PR, QRS, QT, QTc)

### STEP 2: TERRITORIAL CONSISTENCY CHECK (MANDATORY)
- **Critical Safety Feature**: Determines whether ST-segment changes fit a single coronary artery territory
- Flags atypical ischemic patterns that may indicate STEMI mimics
- Explicitly identifies non-territorial, mixed, or atypical ST changes
- Output: "Atypical ischemic pattern – consider STEMI mimic" when appropriate

### STEP 3: STEMI VS STEMI MIMIC ANALYSIS
- **Prevents False Positives**: Evaluates for STEMI mimics before labeling STEMI:
  - LVH with strain
  - Pericarditis (including PR-segment changes)
  - Hypertrophic cardiomyopathy (especially septal patterns)
  - Early repolarization
  - Myocardial infiltration or cardiomyopathy
- Downgrades certainty when mimic criteria are present
- Provides differential diagnoses
- Uses safe language: "ECG findings raise concern for STEMI, however consider [mimic] as alternative diagnosis"

### STEP 4: LVH PHENOTYPE CLASSIFICATION
- Classifies LVH phenotypes:
  - Likely hypertensive (concentric)
  - Possible asymmetric/septal (consider HCM)
  - Indeterminate
- Acknowledges ECG limitations in detecting asymmetric hypertrophy
- Age-specific flags: Young patients with LVH → "Consider cardiomyopathy evaluation"

### STEP 5: CONFIDENCE CALIBRATION
- Conservative confidence assignment:
  - **High**: Clear, classic ECG pattern with no conflicting features
  - **Moderate**: Overlapping features or partial criteria met
  - **Low**: Nonspecific or conflicting findings, possible artifact
- **Critical Rule**: Never assigns "High confidence" if findings are atypical or territorial consistency is questionable
- Explicitly states uncertainty: "Low confidence - findings are nonspecific"

### STEP 6: CLINICAL CONTEXT INTEGRATION
- Age-adjusted interpretation:
  - Young patient + LVH → flags cardiomyopathy
  - Elderly patient + conduction disease → flags fibrosis/degeneration
- Clinical indication integration (when provided)
- Medication effect consideration
- **Important**: Does not assume hypertension unless explicitly provided

### STEP 7: SAFE CLINICAL LANGUAGE
- Uses conservative phrases:
  - "Most consistent with..."
  - "ECG findings raise concern for..."
  - "Cannot exclude..."
  - "Consider..."
  - "Suggestive of..."
- Avoids absolute statements unless ECG is unequivocal (rare)
- Never states "definitive diagnosis" - always acknowledges limitations

### STEP 8: OUTPUT FORMAT
- Summary diagnosis (in clinicalImpression)
- Key supporting evidence (in decisionExplanations)
- Important negatives (what is NOT present)
- Differential diagnosis (when appropriate, in recommendations)
- Clear, safe recommendations
- Confidence level for each finding

## Safety Principles

1. **Detect Emergencies**: High sensitivity for STEMI and dangerous arrhythmias
2. **Flag Uncertainty**: Explicitly identifies ambiguous findings - never hides them
3. **Prevent Overconfidence**: When in doubt, marks confidence as "Low" or "Moderate"
4. **Support, Don't Replace**: Goal is to support cardiologists safely, not replace them
5. **Acknowledge Limitations**: Explicitly states signal/image quality limitations

## Implementation Details

### Signal-Based Interpretation
- Integrated into `interpretWithGemini()` function
- Uses signal quality assessment to inform confidence
- Leverages enhanced signal features (R-R intervals, HRV, statistical features)

### Image-Based Interpretation
- Integrated into `interpretEcgImageWithGemini()` function
- Emphasizes precise grid-based measurements
- Accounts for image quality issues (artifacts, baseline wander)

### Output Structure
- **clinicalImpression**: Includes territorial consistency assessment and STEMI mimic considerations
- **recommendations**: Includes differential diagnoses, especially for STEMI mimics or LVH phenotypes
- **abnormalities**: Lists all findings, including territorial consistency flags
- **decisionExplanations**: Each finding includes safe clinical language and conservative confidence levels

## Benefits

1. **Reduced False Positives**: STEMI mimic analysis prevents incorrect STEMI diagnoses
2. **Improved Safety**: Territorial consistency checks catch atypical patterns
3. **Better Clinical Context**: Age and medication considerations improve accuracy
4. **Appropriate Confidence**: Conservative confidence calibration prevents dangerous overconfidence
5. **Clear Communication**: Safe clinical language ensures appropriate interpretation by clinicians

## Example Output Enhancements

### Before:
- "STEMI in leads II, III, aVF" (High confidence)

### After:
- "ECG findings raise concern for ST elevation in leads II, III, aVF. However, consider early repolarization as alternative diagnosis given patient age and pattern distribution. Moderate confidence - territorial consistency is atypical."

### Before:
- "LVH present" (High confidence)

### After:
- "Left ventricular hypertrophy present, most consistent with concentric pattern. However, ECG has limitations in detecting asymmetric hypertrophy. In young patients, consider cardiomyopathy evaluation. Moderate confidence - phenotype classification is indeterminate."

## Technical Integration

- **File**: `backend/src/services/gemini.ts`
- **Functions Enhanced**:
  - `interpretWithGemini()` - Signal-based interpretation
  - `interpretEcgImageWithGemini()` - Image-based interpretation
- **No Breaking Changes**: Existing output schema maintained, enhanced with better content
- **Backward Compatible**: All existing reports continue to work

## Future Enhancements

1. **Machine Learning Integration**: Use framework outputs to train confidence calibration models
2. **Feedback Loop**: Track which mimics were correctly identified vs. missed
3. **Clinical Validation**: Compare framework outputs with cardiologist interpretations
4. **Pattern Recognition**: Enhance territorial consistency detection with ML
5. **Age-Specific Models**: Develop age-stratified interpretation models

## References

- AHA/ACC Clinical Guidelines
- STEMI Mimic Recognition Protocols
- LVH Phenotype Classification Standards
- Clinical Decision Support Best Practices

