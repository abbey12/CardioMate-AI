import express from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getAllFacilities, getFacilityById, deleteFacility, getAllReports, getReportCount, } from "../services/db.js";
const adminRouter = express.Router();
// All admin routes require authentication
adminRouter.use(requireAdmin);
// ==================== Facilities Management ====================
adminRouter.get("/facilities", async (req, res) => {
    try {
        const facilities = await getAllFacilities();
        res.json(facilities.map((f) => ({
            id: f.id,
            name: f.name,
            email: f.email,
            createdAt: f.createdAt,
        })));
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch facilities" });
    }
});
adminRouter.get("/facilities/:id", async (req, res) => {
    try {
        const facility = await getFacilityById(req.params.id);
        if (!facility) {
            res.status(404).json({ error: "Facility not found" });
            return;
        }
        res.json({
            id: facility.id,
            name: facility.name,
            email: facility.email,
            createdAt: facility.createdAt,
        });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch facility" });
    }
});
adminRouter.delete("/facilities/:id", async (req, res) => {
    try {
        const deleted = await deleteFacility(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: "Facility not found" });
            return;
        }
        res.json({ message: "Facility deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to delete facility" });
    }
});
// ==================== Reports (All Facilities) ====================
adminRouter.get("/reports", async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const reports = await getAllReports(limit, offset);
        res.json(reports);
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch reports" });
    }
});
// ==================== Statistics ====================
adminRouter.get("/stats", async (req, res) => {
    try {
        const totalReports = await getReportCount();
        const facilities = await getAllFacilities();
        res.json({
            totalFacilities: facilities.length,
            totalReports,
            facilities: facilities.map((f) => ({
                id: f.id,
                name: f.name,
                email: f.email,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || "Failed to fetch statistics" });
    }
});
export { adminRouter };
