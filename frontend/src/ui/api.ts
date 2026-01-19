import type { EcgStructuredReport, PatientInfo } from "./types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:4000";

export async function uploadEcg(opts: {
  file: File;
  sampleRateHz?: number;
  patient?: PatientInfo;
}): Promise<EcgStructuredReport> {
  const fd = new FormData();
  fd.append("file", opts.file);
  if (opts.patient) {
    fd.append("patient", JSON.stringify(opts.patient));
  }

  const url = new URL("/ecg/upload", API_BASE);
  if (opts.sampleRateHz) url.searchParams.set("sampleRateHz", String(opts.sampleRateHz));

  const res = await fetch(url.toString(), {
    method: "POST",
    body: fd
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `Upload failed (${res.status})`);
  }
  return json as EcgStructuredReport;
}

export async function downloadReportPdf(id: string): Promise<void> {
  const url = new URL(`/ecg/${id}/download`, API_BASE);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `ECG_Report_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function fetchReport(id: string): Promise<EcgStructuredReport> {
  const url = new URL(`/ecg/${id}`, API_BASE);
  const res = await fetch(url.toString());
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `Fetch failed (${res.status})`);
  }
  return json as EcgStructuredReport;
}


