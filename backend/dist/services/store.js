const reports = new Map();
export function saveReport(report) {
    reports.set(report.id, report);
}
export function getReport(id) {
    return reports.get(id);
}
