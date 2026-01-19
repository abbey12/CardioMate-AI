import React, { useMemo, useState } from "react";
import { downloadReportPdf, uploadEcg } from "./api";
import type { EcgStructuredReport, PatientInfo } from "./types";
import { Waveform } from "./Waveform";

function Field(props: { label: string; value?: React.ReactNode }): JSX.Element {
  return (
    <div className="field">
      <div className="fieldLabel">{props.label}</div>
      <div className="fieldValue">{props.value ?? <span className="muted">—</span>}</div>
    </div>
  );
}

export function App(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [sampleRateHz, setSampleRateHz] = useState<number>(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EcgStructuredReport | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  
  // Patient information form state
  const [patientInfo, setPatientInfo] = useState<Partial<PatientInfo>>({
    name: "",
    age: undefined,
    sex: "unknown",
    medicalRecordNumber: "",
    clinicalIndication: "",
    medications: [],
  });
  const [medicationInput, setMedicationInput] = useState<string>("");

  const rPeaksPreview = useMemo(() => {
    if (!report?.preprocess?.rPeakIndices || !report?.signalPreview?.normalized)
      return [];
    const limit = report.signalPreview.normalized.length;
    return report.preprocess.rPeakIndices.filter((i) => i >= 0 && i < limit);
  }, [report]);

  async function onUpload(): Promise<void> {
    if (!file) return;
    
    // Validate required patient fields
    if (!patientInfo.name || patientInfo.age === undefined || !patientInfo.sex || patientInfo.sex === "unknown") {
      setError("Please fill in required patient information: Name, Age, and Sex");
      return;
    }

    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const patient: PatientInfo = {
        name: patientInfo.name!,
        age: patientInfo.age!,
        sex: patientInfo.sex as "male" | "female" | "other" | "unknown",
        medicalRecordNumber: patientInfo.medicalRecordNumber || undefined,
        clinicalIndication: patientInfo.clinicalIndication || undefined,
        medications: patientInfo.medications && patientInfo.medications.length > 0 
          ? patientInfo.medications 
          : undefined,
        priorEcgDate: patientInfo.priorEcgDate || undefined,
      };
      const r = await uploadEcg({ file, sampleRateHz, patient });
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadPdf(): Promise<void> {
    if (!report) return;
    try {
      await downloadReportPdf(report.id);
    } catch (e: any) {
      setError(e?.message ?? "Download failed");
    }
  }

  function addMedication(): void {
    if (!medicationInput.trim()) return;
    setPatientInfo({
      ...patientInfo,
      medications: [...(patientInfo.medications || []), medicationInput.trim()],
    });
    setMedicationInput("");
  }

  function removeMedication(index: number): void {
    setPatientInfo({
      ...patientInfo,
      medications: patientInfo.medications?.filter((_, i) => i !== index) || [],
    });
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="brand">Cardio AI ECG Interpretation Platform</div>
          <div className="tagline">
            Clinical-grade ECG analysis powered by CardioMate AI
          </div>
        </div>
        <div className="pill">Backend: `POST /ecg/upload`</div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Patient Information</div>
              <div className="cardSubtle">
                Required for clinical interpretation
              </div>
            </div>
          </div>

          <div className="stack">
            <label className="inputRow">
              <div className="inputLabel">Name <span style={{ color: "#c00" }}>*</span></div>
              <input
                type="text"
                value={patientInfo.name || ""}
                onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                placeholder="Patient full name"
                required
              />
            </label>

            <label className="inputRow">
              <div className="inputLabel">Age <span style={{ color: "#c00" }}>*</span></div>
              <input
                type="number"
                min="0"
                max="150"
                value={patientInfo.age ?? ""}
                onChange={(e) => {
                  const value = e.target.value === "" ? undefined : Number(e.target.value);
                  setPatientInfo({ ...patientInfo, age: value });
                }}
                placeholder="Enter age in years"
                required
              />
              <div className="hint">Patient age in years (0-150)</div>
            </label>

            <label className="inputRow">
              <div className="inputLabel">Sex <span style={{ color: "#c00" }}>*</span></div>
              <select
                value={patientInfo.sex || "unknown"}
                onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value as any })}
                required
              >
                <option value="unknown">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="inputRow">
              <div className="inputLabel">Medical Record Number</div>
              <input
                type="text"
                value={patientInfo.medicalRecordNumber || ""}
                onChange={(e) => setPatientInfo({ ...patientInfo, medicalRecordNumber: e.target.value })}
                placeholder="MRN (optional)"
              />
            </label>

            <label className="inputRow">
              <div className="inputLabel">Clinical Indication</div>
              <input
                type="text"
                value={patientInfo.clinicalIndication || ""}
                onChange={(e) => setPatientInfo({ ...patientInfo, clinicalIndication: e.target.value })}
                placeholder="e.g., Chest pain, Syncope, Routine screening"
              />
            </label>

            <label className="inputRow">
              <div className="inputLabel">Medications</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                  placeholder="Add medication (press Enter)"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addMedication} className="button" style={{ padding: "8px 16px" }}>
                  Add
                </button>
              </div>
              {patientInfo.medications && patientInfo.medications.length > 0 && (
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {patientInfo.medications.map((med, i) => (
                    <span key={i} style={{ 
                      background: "#e3f2fd", 
                      padding: "4px 8px", 
                      borderRadius: "4px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      {med}
                      <button
                        type="button"
                        onClick={() => removeMedication(i)}
                        style={{ 
                          background: "none", 
                          border: "none", 
                          cursor: "pointer",
                          color: "#666",
                          fontSize: "14px",
                          padding: 0,
                          width: "16px",
                          height: "16px"
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Upload ECG</div>
              <div className="cardSubtle">
                Supported: <b>.csv</b>, <b>.json</b>, <b>.png</b>, <b>.jpg</b>, <b>.jpeg</b>
              </div>
            </div>
          </div>

          <div className="stack">
            <label className="inputRow">
              <div className="inputLabel">ECG file</div>
              <input
                type="file"
                accept=".csv,.json,.png,.jpg,.jpeg,text/csv,application/json,image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (localImageUrl) URL.revokeObjectURL(localImageUrl);
                  if (f && f.type.startsWith("image/")) {
                    setLocalImageUrl(URL.createObjectURL(f));
                  } else {
                    setLocalImageUrl(null);
                  }
                }}
              />
            </label>

            <label className="inputRow">
              <div className="inputLabel">Sample rate (Hz)</div>
              <input
                type="number"
                min={1}
                value={sampleRateHz}
                onChange={(e) => setSampleRateHz(Number(e.target.value))}
              />
              <div className="hint">
                Used for CSV. JSON can include its own <code>sampleRateHz</code>.
                Images ignore this value.
              </div>
            </label>

            <button className="button" disabled={!file || busy} onClick={onUpload}>
              {busy ? "Interpreting…" : "Upload & Interpret"}
            </button>

            {error && <div className="error">{error}</div>}

            <div className="hint">
              Tip: use the included example file under <code>backend/examples/</code>.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Report</div>
              <div className="cardSubtle">
                {report
                  ? `ID: ${report.id} · Created: ${new Date(report.createdAt).toLocaleString()}`
                  : "Upload an ECG to generate a report"}
              </div>
            </div>
            {report && (
              <button className="button" onClick={onDownloadPdf} style={{ marginLeft: "auto" }}>
                📥 Download PDF Report
              </button>
            )}
          </div>

          {!report ? (
            <div className="empty">
              No report yet.
              <div className="muted">
                When <code>GEMINI_API_KEY</code> is not set, the backend returns a deterministic
                mock report so you can test the workflow.
              </div>
            </div>
          ) : (
            <div className="report">
              {report.source.format === "image" ? (
                <div className="section">
                  <div className="sectionTitle">Uploaded ECG image</div>
                  <div className="imageFrame">
                    <img
                      alt="Uploaded ECG"
                      src={
                        localImageUrl ??
                        (report.imagePreview
                          ? `data:${report.imagePreview.mimeType};base64,${report.imagePreview.base64}`
                          : "")
                      }
                    />
                  </div>
                  <div className="hint">
                    Image-based interpretation does not produce a waveform plot in this prototype.
                  </div>
                </div>
              ) : null}

              <div className="twoCol">
                <Field label="Heart rate (bpm)" value={report.measurements.heartRateBpm} />
                <Field label="Rhythm" value={report.measurements.rhythm} />
                <Field label="PR (ms)" value={report.measurements.prMs} />
                <Field label="QRS (ms)" value={report.measurements.qrsMs} />
                <Field label="QT (ms)" value={report.measurements.qtMs} />
                <Field label="QTc (ms)" value={report.measurements.qtcMs} />
              </div>

              <div className="section">
                <div className="sectionTitle">Abnormalities</div>
                {report.abnormalities?.length ? (
                  <ul className="list">
                    {report.abnormalities.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted">None reported.</div>
                )}
              </div>

              <div className="section">
                <div className="sectionTitle">Clinical impression</div>
                <div className="blockquote">{report.clinicalImpression}</div>
              </div>

              {report.recommendations && report.recommendations.length > 0 && (
                <div className="section">
                  <div className="sectionTitle">Recommendations</div>
                  <ul className="list">
                    {report.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.patient && (
                <div className="section">
                  <div className="sectionTitle">Patient Information</div>
                  <div className="twoCol">
                    <Field label="Name" value={report.patient.name} />
                    <Field label="Age" value={`${report.patient.age} years`} />
                    <Field label="Sex" value={report.patient.sex} />
                    {report.patient.medicalRecordNumber && (
                      <Field label="MRN" value={report.patient.medicalRecordNumber} />
                    )}
                    {report.patient.clinicalIndication && (
                      <Field label="Clinical Indication" value={report.patient.clinicalIndication} />
                    )}
                    {report.patient.medications && report.patient.medications.length > 0 && (
                      <Field 
                        label="Medications" 
                        value={report.patient.medications.join(", ")} 
                      />
                    )}
                  </div>
                </div>
              )}

              {report.signalPreview?.normalized?.length ? (
                <Waveform
                  title="Waveform preview (normalized) + R-peak markers (heuristic)"
                  samples={report.signalPreview.normalized}
                  rPeaks={rPeaksPreview}
                />
              ) : null}

              <details className="details">
                <summary>Raw report JSON</summary>
                <pre className="pre">{JSON.stringify(report, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


