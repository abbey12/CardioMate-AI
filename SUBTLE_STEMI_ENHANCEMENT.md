# Subtle, Noncontiguous, and High Lateral STEMI Detection Enhancement

## Overview
This document outlines the comprehensive enhancements made to address the major weakness in detecting subtle, noncontiguous, and high lateral STEMI patterns. The system now prioritizes pattern recognition over simple threshold detection and ensures life-saving priority for all STEMI types, including subtle findings.

## Major Weakness Addressed

### Primary Weakness
- **Subtle, noncontiguous, or high lateral STEMI** detection was insufficient
- System may have missed patterns with small ST elevation (<2mm)
- High lateral STEMI (D1 branch) was not being prioritized appropriately

## Key Enhancements

### 1. Pattern Recognition Priority
**Shift from threshold-based to pattern-based detection:**
- **Do NOT rely solely on absolute ST thresholds**
- Use **spatial patterns, ST/QRS ratios, and reciprocal changes**
- Consider the **entire 12-lead ECG holistically**
- Integrate **conduction abnormalities as diagnostic clues**

### 2. High Lateral STEMI Detection (CRITICAL)
**"African Pattern" - D1 Branch Occlusion:**
- **Pattern**: ST elevation in I, aVL, V2 with ST depression in II, III, aVF (reciprocal changes)
- **Critical Characteristics**:
  * May have small ST elevation (<2mm) - **DO NOT MISS THIS**
  * Often noncontiguous (elevation in high lateral, depression in inferior)
  * **LIFE-SAVING** - delayed recognition increases mortality risk
  * Escalate to **Life-Saving priority even if subtle**

**Detection Instructions:**
- Look for ST elevation in I, aVL, V2
- Look for ST depression in II, III, aVF (reciprocal changes)
- Even if ST elevation is small (<2mm), flag as high lateral STEMI
- **DO NOT MISS THIS PATTERN** - escalate to Life-Saving priority

### 3. Subtle/Noncontiguous STEMI Detection
**Enhanced Detection Criteria:**
- Patterns with small ST elevation (<2mm) spread across non-adjacent leads
- May be present even with baseline wander, low voltage, or artifacts
- Use **ST/QRS ratios and spatial patterns**, not just absolute thresholds
- Integrate **conduction abnormalities** (first-degree AV block, LBBB) as diagnostic clues
- Evaluate **reciprocal changes in opposing leads** to confirm infarct territory

### 4. Multi-Lead Analysis
**Comprehensive Lead Assessment:**
- Consider the **ENTIRE 12-lead ECG** (and additional leads if available: V4R, V7-V9)
- Evaluate **reciprocal changes in opposing leads** to confirm infarct territory
- Look for spatial patterns across non-adjacent leads
- Integrate all leads holistically, not in isolation

### 5. Life-Saving Prioritization
**Priority Assignment:**
- **For subtle high lateral STEMIs**: Escalate to **Life-Saving** even if ST elevation is small (<2mm)
- **Delayed recognition increases mortality risk** - prioritize urgency
- All STEMI types (including subtle/high lateral) receive **Life-Saving priority**
- Even with lower confidence, still flag urgency

### 6. Enhanced Confidence Calibration
**Patient Safety Priority:**
- For subtle or borderline STEMIs (including high lateral):
  * Indicate lower confidence (Moderate or Low)
  * **BUT STILL FLAG URGENCY**
  * Recommend confirmatory imaging or expert review
  * **BUT still flag urgency and recommend immediate cardiology consultation**

**Confidence Rules:**
- For subtle ST elevations (<2mm) or noncontiguous patterns, default to "Moderate" or "Low" confidence
- When confidence is low, recommend:
  * Confirmatory imaging or additional leads (V7-V9, V4R)
  * Serial ECGs and biomarker correlation
  * Expert cardiology review
  * **BUT still flag urgency**

### 7. Actionable Recommendations
**For Life-Saving STEMI (including subtle/high lateral):**
- **Immediate cardiology consultation**
- **PCI / cath lab activation**
- **Serial ECGs and biomarker correlation**

**For Subtle or Borderline Findings:**
- Recommend confirmatory imaging or expert review
- Suggest additional diagnostic leads if needed (V4R for RV, V7-V9 for posterior)
- Serial ECGs and biomarker correlation
- **BUT still flag urgency and recommend immediate cardiology consultation**

### 8. Enhanced Output Structure
**Clinical Impression:**
- Summary diagnosis with location (anterior, inferior, lateral, posterior, RV, **high lateral**)
- **Priority level: "Life-Saving" for ALL STEMI types (including subtle/high lateral)**
- **For subtle high lateral STEMI**: Explicitly state "Life-Saving priority - delayed recognition increases mortality risk"

**Recommendations:**
- Immediate cardiology consultation for all STEMI types
- PCI/cath lab activation for confirmed STEMI
- Serial ECGs and biomarker correlation
- Additional diagnostic leads (V7-V9, V4R) when needed
- Ensure recommendations are **clinically actionable and understandable by emergency personnel**

**Abnormalities:**
- **High lateral STEMI (D1 branch, "African Pattern")** if detected
- **Subtle or noncontiguous patterns (especially high lateral)**
- Conduction abnormalities used as diagnostic clues

**Decision Explanations:**
- Evidence includes:
  * Assessment of subtle patterns, reciprocal changes, and rhythm context
  * **ST/QRS ratios and spatial patterns (not just absolute thresholds)**
  * **Multi-lead analysis across entire 12-lead ECG**
  * **Integration of conduction abnormalities as diagnostic clues**

## Detection Framework

### STEP 1: IDENTIFY PATTERNS (COMPREHENSIVE - PATTERN RECOGNITION PRIORITY)
- **CRITICAL**: Use pattern recognition and multi-lead analysis over simple threshold detection
- Consider the ENTIRE 12-lead ECG
- Do NOT rely solely on absolute ST thresholds
- Identify **HIGH LATERAL STEMI (CRITICAL - D1 BRANCH)**:
  * "African Pattern": ST elevation in I, aVL, V2 with ST depression in II, III, aVF
  * May have small ST elevation (<2mm) - DO NOT MISS THIS
  * Often noncontiguous
  * LIFE-SAVING - delayed recognition increases mortality risk
- Identify **Subtle or noncontiguous ST elevations**:
  * Patterns with small ST elevation (<2mm) spread across non-adjacent leads
  * Use ST/QRS ratios and spatial patterns, not just absolute thresholds
  * Integrate conduction abnormalities as diagnostic clues

### STEP 2: TERRITORIAL CONSISTENCY CHECK (MANDATORY - MULTI-LEAD ANALYSIS)
- Evaluate reciprocal changes in opposing leads to confirm infarct territory
- Assess for subtle or noncontiguous ST elevations (<2mm)
- **Check for HIGH LATERAL STEMI (D1 BRANCH) - CRITICAL**:
  * Look for ST elevation in I, aVL, V2
  * Look for ST depression in II, III, aVF (reciprocal changes)
  * "African Pattern" - even if ST elevation is small (<2mm)
  * This is LIFE-SAVING - delayed recognition increases mortality risk
  * DO NOT MISS THIS PATTERN - escalate to Life-Saving priority even if subtle

## Safety Principles

1. **Detect ALL STEMI types with high sensitivity** - including subtle, noncontiguous, posterior, RV, and HIGH LATERAL patterns
2. **Prioritize patient risk autonomously**: 
   - Assign "Life-Saving" priority for ALL STEMI types, including subtle high lateral STEMI
   - For subtle high lateral STEMIs, escalate to Life-Saving even if ST elevation is small (<2mm)
   - Delayed recognition of high lateral STEMI increases mortality risk - prioritize urgency
3. **Pattern recognition over thresholds**: 
   - Use spatial patterns, ST/QRS ratios, and reciprocal changes
   - Do not rely solely on absolute ST thresholds
   - Consider the entire 12-lead ECG holistically
4. **Patient safety first**: Even with lower confidence, still flag urgency and recommend immediate cardiology consultation

## Example Output Enhancements

### Before:
- "ST elevation in leads I, aVL" (Moderate confidence, Routine priority)

### After:
- "ECG findings raise concern for high lateral STEMI (D1 branch, 'African Pattern') with ST elevation in I, aVL, V2 and reciprocal ST depression in II, III, aVF. Pattern is subtle (<2mm elevation) but is LIFE-SAVING - delayed recognition increases mortality risk. Moderate confidence - recommend immediate cardiology consultation, PCI/cath lab activation, and serial ECGs with biomarker correlation. Life-Saving priority."

### Before:
- "Subtle ST elevation in noncontiguous leads" (Low confidence, Routine priority)

### After:
- "ECG findings raise concern for subtle, noncontiguous ST elevation pattern. ST elevation <2mm in leads [X, Y] with reciprocal changes in [Z]. Pattern recognition suggests possible STEMI. Low confidence - recommend immediate cardiology consultation, confirmatory imaging, additional leads (V7-V9, V4R), serial ECGs, and biomarker correlation. Time-Critical priority - do not delay evaluation."

## Technical Implementation

- **File**: `backend/src/services/gemini.ts`
- **Functions Enhanced**:
  - `interpretWithGemini()` - Signal-based interpretation
  - `interpretEcgImageWithGemini()` - Image-based interpretation
- **Key Changes**:
  - Added ADVANCED DETECTION CAPABILITIES section emphasizing pattern recognition
  - Enhanced STEP 1 with comprehensive pattern identification
  - Enhanced STEP 2 with high lateral STEMI detection
  - Enhanced STEP 5 with patient safety priority in confidence calibration
  - Enhanced output requirements with actionable recommendations
  - Updated critical safety principles

## Benefits

1. **Improved Detection**: Specifically addresses weakness in subtle, noncontiguous, and high lateral STEMI
2. **Life-Saving Priority**: Ensures all STEMI types receive appropriate urgency, even if subtle
3. **Pattern Recognition**: Shifts from threshold-based to pattern-based detection
4. **Multi-Lead Analysis**: Considers entire 12-lead ECG holistically
5. **Actionable Guidance**: Provides specific recommendations for immediate action
6. **Patient Safety**: Prioritizes patient safety even with lower confidence

## Training Notes

- Train on datasets including:
  * Classic STEMI
  * **Subtle high lateral STEMI** (D1 branch, "African Pattern")
  * **Subtle, noncontiguous STEMI patterns**
  * RV STEMI
  * Posterior STEMI
  * STEMI mimics
  * African ECGs
- Reinforce **pattern recognition and multi-lead analysis** over simple threshold detection
- Prioritize **patient safety and urgency** in all outputs
- Emphasize **ST/QRS ratios, spatial patterns, and reciprocal changes**

## References

- High Lateral STEMI Recognition Protocols
- D1 Branch Occlusion Patterns ("African Pattern")
- Subtle ECG Pattern Recognition
- Multi-Lead ECG Analysis
- Pattern Recognition vs. Threshold Detection in ECG Interpretation

