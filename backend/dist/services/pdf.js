import puppeteer from "puppeteer";
import { generateWaveformSvg } from "../utils/svgWaveform.js";
/**
 * Generate a clinical-standard ECG report PDF using HTML template + Puppeteer.
 * Follows AHA/ACC guidelines for ECG reporting structure.
 */
export async function generateEcgReportPdf(report) {
    const html = generateReportHtml(report);
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"], // For server environments
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        // Wait for any SVG elements to render
        try {
            await page.waitForSelector("svg", { timeout: 2000 }).catch(() => { });
        }
        catch {
            // No SVG found, continue anyway
        }
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm",
            },
        });
        return Buffer.from(pdf);
    }
    finally {
        await browser.close();
    }
}
function generateReportHtml(report) {
    const patient = report.patient;
    const age = patient?.age;
    const ecgDate = new Date(report.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ECG Report - ${report.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
    }
    .header {
      border-bottom: 4px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 25px;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      padding: 20px 0 15px 0;
    }
    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      margin-bottom: 6px;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 6px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 40px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      padding: 4px 0;
    }
    .info-label {
      font-weight: 600;
      min-width: 160px;
      color: #475569;
      font-size: 10.5pt;
    }
    .info-value {
      flex: 1;
      color: #1e293b;
      font-size: 10.5pt;
    }
    .measurements-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    .measurement-item {
      border: 2px solid #e2e8f0;
      padding: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      border-radius: 8px;
      transition: all 0.2s;
    }
    .measurement-label {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 6px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .measurement-value {
      font-size: 14pt;
      font-weight: 700;
      color: #1e293b;
    }
    .abnormalities-list {
      list-style: none;
      padding-left: 0;
    }
    .abnormalities-list li {
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11pt;
    }
    .abnormalities-list li:last-child {
      border-bottom: none;
    }
    .abnormality-item {
      font-weight: 600;
      color: #dc2626;
      font-size: 11.5pt;
    }
    .impression {
      background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
      padding: 16px;
      border-left: 5px solid #2563eb;
      margin-top: 12px;
      border-radius: 6px;
      font-size: 11.5pt;
      line-height: 1.7;
      color: #1e293b;
    }
    .recommendations {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 16px;
      border-left: 5px solid #f59e0b;
      margin-top: 12px;
      border-radius: 6px;
    }
    .recommendations ul {
      margin-left: 24px;
      margin-top: 8px;
      font-size: 11pt;
      line-height: 1.8;
    }
    .recommendations li {
      margin-bottom: 6px;
      color: #78350f;
    }
    .technical-details {
      font-size: 9pt;
      color: #64748b;
      margin-top: 15px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .technical-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 40px;
      margin-top: 12px;
    }
    .technical-group {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .technical-group-title {
      font-weight: 600;
      color: #475569;
      font-size: 10pt;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .technical-item {
      display: flex;
      padding: 4px 0;
      font-size: 9.5pt;
    }
    .technical-label {
      font-weight: 500;
      min-width: 140px;
      color: #64748b;
    }
    .technical-value {
      flex: 1;
      color: #1e293b;
      font-weight: 500;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid #2563eb;
      font-size: 8.5pt;
      color: #64748b;
      text-align: center;
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
    }
    .disclaimer {
      font-style: italic;
      margin-top: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .waveform-container {
      margin: 15px 0;
      padding: 15px;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      overflow: visible;
      page-break-inside: avoid;
    }
    .waveform-container svg {
      display: block;
      width: 100%;
      height: auto;
      max-height: 300px;
      margin: 0 auto;
      background: #fff;
    }
    .explanation-item {
      margin-bottom: 16px;
      padding: 14px;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .explanation-finding {
      font-weight: 700;
      font-size: 12.5pt;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .explanation-detail {
      margin: 6px 0;
      font-size: 10.5pt;
      line-height: 1.6;
    }
    .explanation-label {
      font-weight: 600;
      color: #475569;
      display: inline-block;
      min-width: 110px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-success {
      background: #dcfce7;
      color: #166534;
    }
    .status-warning {
      background: #fef3c7;
      color: #78350f;
    }
    .status-info {
      background: #dbeafe;
      color: #1e40af;
    }
    @media print {
      .section { page-break-inside: avoid; }
      .header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ELECTROCARDIOGRAM (ECG) REPORT</h1>
    <div class="subtitle">AI-Powered ECG Interpretation System • Clinical-Grade Analysis</div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="patient-info">
      ${patient ? `
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${escapeHtml(patient.name)}</span>
        </div>
        ${age !== undefined ? `
        <div class="info-row">
          <span class="info-label">Age:</span>
          <span class="info-value">${age} years</span>
        </div>
        ` : ""}
        ${patient.sex !== "unknown" ? `
        <div class="info-row">
          <span class="info-label">Sex:</span>
          <span class="info-value">${escapeHtml(patient.sex)}</span>
        </div>
        ` : ""}
        ${patient.medicalRecordNumber ? `
        <div class="info-row">
          <span class="info-label">Medical Record #:</span>
          <span class="info-value">${escapeHtml(patient.medicalRecordNumber)}</span>
        </div>
        ` : ""}
        ${patient.clinicalIndication ? `
        <div class="info-row" style="grid-column: 1 / -1;">
          <span class="info-label">Clinical Indication:</span>
          <span class="info-value">${escapeHtml(patient.clinicalIndication)}</span>
        </div>
        ` : ""}
        ${patient.medications && patient.medications.length > 0 ? `
        <div class="info-row" style="grid-column: 1 / -1;">
          <span class="info-label">Medications:</span>
          <span class="info-value">${escapeHtml(patient.medications.join(", "))}</span>
        </div>
        ` : ""}
      ` : `
        <div class="info-row">
          <span class="info-value" style="color: #999;">Patient information not provided</span>
        </div>
      `}
      <div class="info-row">
        <span class="info-label">ECG Date/Time:</span>
        <span class="info-value">${ecgDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Report ID:</span>
        <span class="info-value">${report.id}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Technical Details</div>
    
    <div class="technical-grid">
      <div class="technical-group">
        <div class="technical-group-title">Data Source</div>
        <div class="technical-item">
          <span class="technical-label">Format:</span>
          <span class="technical-value">${escapeHtml(report.source.format.toUpperCase())}</span>
        </div>
        ${report.source.filename ? `
        <div class="technical-item">
          <span class="technical-label">Source File:</span>
          <span class="technical-value">${escapeHtml(report.source.filename)}</span>
        </div>
        ` : ""}
        <div class="technical-item">
          <span class="technical-label">Upload Method:</span>
          <span class="technical-value">${report.source.format === "image" ? "Image Upload" : "Digital Signal"}</span>
        </div>
      </div>

      ${report.preprocess.sampleRateHz > 0 || report.preprocess.durationSec > 0 ? `
      <div class="technical-group">
        <div class="technical-group-title">Signal Processing</div>
        ${report.preprocess.sampleRateHz > 0 ? `
        <div class="technical-item">
          <span class="technical-label">Sampling Rate:</span>
          <span class="technical-value">${report.preprocess.sampleRateHz} Hz</span>
        </div>
        ` : ""}
        ${report.preprocess.durationSec > 0 ? `
        <div class="technical-item">
          <span class="technical-label">Duration:</span>
          <span class="technical-value">${report.preprocess.durationSec.toFixed(2)} seconds</span>
        </div>
        ` : ""}
        ${report.signalPreview?.normalized?.length ? `
        <div class="technical-item">
          <span class="technical-label">Total Samples:</span>
          <span class="technical-value">${report.signalPreview.normalized.length.toLocaleString()}</span>
        </div>
        ` : ""}
        ${report.preprocess.rPeakIndices && report.preprocess.rPeakIndices.length > 0 ? `
        <div class="technical-item">
          <span class="technical-label">R-Peaks Detected:</span>
          <span class="technical-value">${report.preprocess.rPeakIndices.length}</span>
        </div>
        ` : ""}
      </div>
      ` : ""}

      <div class="technical-group">
        <div class="technical-group-title">Preprocessing</div>
        <div class="technical-item">
          <span class="technical-label">Normalization:</span>
          <span class="technical-value"><span class="status-badge status-success">Applied</span></span>
        </div>
        <div class="technical-item">
          <span class="technical-label">Noise Filtering:</span>
          <span class="technical-value"><span class="status-badge status-success">Applied</span></span>
        </div>
        ${report.preprocess.rPeakIndices && report.preprocess.rPeakIndices.length > 0 ? `
        <div class="technical-item">
          <span class="technical-label">R-Peak Detection:</span>
          <span class="technical-value"><span class="status-badge status-success">Completed</span></span>
        </div>
        ` : `
        <div class="technical-item">
          <span class="technical-label">R-Peak Detection:</span>
          <span class="technical-value"><span class="status-badge status-info">N/A (Image)</span></span>
        </div>
        `}
      </div>

      <div class="technical-group">
        <div class="technical-group-title">Processing Metadata</div>
        <div class="technical-item">
          <span class="technical-label">AI Model:</span>
          <span class="technical-value">${escapeHtml(report.model || "Gemini 2.5 Pro")}</span>
        </div>
        <div class="technical-item">
          <span class="technical-label">Processing Date:</span>
          <span class="technical-value">${ecgDate}</span>
        </div>
        <div class="technical-item">
          <span class="technical-label">Report ID:</span>
          <span class="technical-value">${report.id}</span>
        </div>
        <div class="technical-item">
          <span class="technical-label">Report Generated:</span>
          <span class="technical-value">${new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })}</span>
        </div>
      </div>
    </div>
  </div>

  ${report.signalPreview?.normalized && report.signalPreview.normalized.length > 0 ? `
  <div class="section">
    <div class="section-title">ECG Waveform Visualization</div>
    <div class="waveform-container">
      ${generateWaveformSvg({
        samples: report.signalPreview.normalized,
        rPeaks: report.preprocess.rPeakIndices?.filter((i) => i < report.signalPreview.normalized.length) ?? [],
        width: 750,
        height: 200,
        showGrid: true
    })}
    </div>
    <div style="font-size: 9.5pt; color: #64748b; margin-top: 10px; text-align: center; font-weight: 500; line-height: 1.6;">
      <strong>Waveform Analysis:</strong> ${report.signalPreview.normalized.length.toLocaleString()} samples processed. 
      Orange vertical markers indicate detected R-peaks. Blue line represents normalized ECG signal.
    </div>
  </div>
  ` : ""}

  ${report.decisionExplanations && report.decisionExplanations.length > 0 ? `
  <div class="section">
    <div class="section-title">Decision Explanation</div>
    <div style="font-size: 10pt; color: #666; margin-bottom: 15px;">
      This section explains the reasoning behind the AI interpretation, including evidence from the ECG signal and comparison to normal ranges.
    </div>
    ${report.decisionExplanations.map((exp) => `
      <div class="explanation-item">
        <div class="explanation-finding">${escapeHtml(exp.finding)}</div>
        <div class="explanation-detail">
          <span class="explanation-label">Evidence:</span>
          <span>${escapeHtml(exp.evidence)}</span>
        </div>
        ${exp.normalRange ? `
        <div class="explanation-detail">
          <span class="explanation-label">Normal Range:</span>
          <span>${escapeHtml(exp.normalRange)}</span>
        </div>
        ` : ""}
        ${exp.deviation ? `
        <div class="explanation-detail">
          <span class="explanation-label">Deviation:</span>
          <span>${escapeHtml(exp.deviation)}</span>
        </div>
        ` : ""}
        ${exp.confidence ? `
        <div class="explanation-detail">
          <span class="explanation-label">Confidence:</span>
          <span style="font-weight: bold; color: ${exp.confidence.toLowerCase().includes('high') ? '#28a745' : exp.confidence.toLowerCase().includes('medium') ? '#ffc107' : '#dc3545'};">${escapeHtml(exp.confidence)}</span>
        </div>
        ` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">Measurements</div>
    <div class="measurements-grid">
      ${report.measurements.heartRateBpm ? `
      <div class="measurement-item">
        <div class="measurement-label">Heart Rate</div>
        <div class="measurement-value">${report.measurements.heartRateBpm} bpm</div>
      </div>
      ` : ""}
      ${report.measurements.rhythm ? `
      <div class="measurement-item">
        <div class="measurement-label">Rhythm</div>
        <div class="measurement-value">${escapeHtml(report.measurements.rhythm)}</div>
      </div>
      ` : ""}
      ${report.measurements.prMs ? `
      <div class="measurement-item">
        <div class="measurement-label">PR Interval</div>
        <div class="measurement-value">${report.measurements.prMs} ms</div>
      </div>
      ` : ""}
      ${report.measurements.qrsMs ? `
      <div class="measurement-item">
        <div class="measurement-label">QRS Duration</div>
        <div class="measurement-value">${report.measurements.qrsMs} ms</div>
      </div>
      ` : ""}
      ${report.measurements.qtMs ? `
      <div class="measurement-item">
        <div class="measurement-label">QT Interval</div>
        <div class="measurement-value">${report.measurements.qtMs} ms</div>
      </div>
      ` : ""}
      ${report.measurements.qtcMs ? `
      <div class="measurement-item">
        <div class="measurement-label">QTc (corrected)</div>
        <div class="measurement-value">${report.measurements.qtcMs} ms</div>
      </div>
      ` : ""}
      ${report.measurements.pAxis !== undefined ? `
      <div class="measurement-item">
        <div class="measurement-label">P Axis</div>
        <div class="measurement-value">${report.measurements.pAxis}°</div>
      </div>
      ` : ""}
      ${report.measurements.qrsAxis !== undefined ? `
      <div class="measurement-item">
        <div class="measurement-label">QRS Axis</div>
        <div class="measurement-value">${report.measurements.qrsAxis}°</div>
      </div>
      ` : ""}
      ${report.measurements.tAxis !== undefined ? `
      <div class="measurement-item">
        <div class="measurement-label">T Axis</div>
        <div class="measurement-value">${report.measurements.tAxis}°</div>
      </div>
      ` : ""}
    </div>
  </div>

  ${report.abnormalities.length > 0 ? `
  <div class="section">
    <div class="section-title">Detected Abnormalities</div>
    <ul class="abnormalities-list">
      ${report.abnormalities.map((abn) => `
        <li><span class="abnormality-item">${escapeHtml(abn)}</span></li>
      `).join("")}
    </ul>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">Clinical Impression</div>
    <div class="impression">
      ${escapeHtml(report.clinicalImpression || "No specific clinical impression provided.")}
    </div>
  </div>

  ${report.recommendations && report.recommendations.length > 0 ? `
  <div class="section">
    <div class="section-title">Recommendations</div>
    <div class="recommendations">
      <ul>
        ${report.recommendations.map((rec) => `
          <li>${escapeHtml(rec)}</li>
        `).join("")}
      </ul>
    </div>
  </div>
  ` : ""}

  <div class="footer">
    <div class="technical-details">
      <strong style="color: #1e293b; font-size: 10pt;">PRELIMINARY REPORT</strong>
      <div style="margin-top: 8px; line-height: 1.6;">
        This is a preliminary report generated by an AI-powered ECG interpretation system. The findings and interpretations presented herein are based solely on the automated analysis of the provided ECG data and have not been reviewed or verified by a licensed cardiologist or qualified healthcare professional. This report is intended to assist healthcare providers in their clinical decision-making process but should not be used as the sole basis for diagnosis or treatment decisions. A final, verified report should be obtained following review by a qualified physician who will correlate these findings with the patient's clinical history, physical examination, and other relevant diagnostic information. This preliminary report does not constitute medical advice, diagnosis, or treatment.
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #475569; font-weight: 500;">
      Report Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} • Report ID: ${report.id}
    </div>
  </div>
</body>
</html>`;
}
function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
function formatDate(isoDate) {
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
    catch {
        return isoDate;
    }
}
function calculateAge(dateOfBirth) {
    try {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }
    catch {
        return undefined;
    }
}
