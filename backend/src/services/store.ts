import type { EcgStructuredReport } from "../types/ecg.js";

const reports = new Map<string, EcgStructuredReport>();

export function saveReport(report: EcgStructuredReport): void {
  reports.set(report.id, report);
}

export function getReport(id: string): EcgStructuredReport | undefined {
  return reports.get(id);
}


