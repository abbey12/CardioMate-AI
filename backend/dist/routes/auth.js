import express from "express";
import { z } from "zod";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { createAdmin, getAdminByEmail, getFacilityByEmail, createFacility } from "../services/db.js";
import { requireAdmin } from "../middleware/auth.js";
const authRouter = express.Router();
const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
const AdminSignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
});
const FacilitySignupSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
});
// ==================== Admin Auth ====================
authRouter.post("/admin/signup", async (req, res) => {
    try {
        const data = AdminSignupSchema.parse(req.body);
        // Check if admin already exists
        const existing = await getAdminByEmail(data.email);
        if (existing) {
            res.status(400).json({ error: "Admin with this email already exists" });
            return;
        }
        const passwordHash = await hashPassword(data.password);
        const admin = await createAdmin(data.email, passwordHash, data.name);
        const token = generateAccessToken({
            userId: admin.id,
            role: "admin",
            email: admin.email,
        });
        const refreshToken = generateRefreshToken({
            userId: admin.id,
            role: "admin",
            email: admin.email,
        });
        res.status(201).json({
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
            },
            accessToken: token,
            refreshToken: refreshToken,
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Signup failed" });
    }
});
authRouter.post("/admin/login", async (req, res) => {
    try {
        const data = LoginSchema.parse(req.body);
        const admin = await getAdminByEmail(data.email);
        if (!admin) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const isValid = await verifyPassword(data.password, admin.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const token = generateAccessToken({
            userId: admin.id,
            role: "admin",
            email: admin.email,
        });
        const refreshToken = generateRefreshToken({
            userId: admin.id,
            role: "admin",
            email: admin.email,
        });
        res.json({
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
            },
            accessToken: token,
            refreshToken: refreshToken,
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Login failed" });
    }
});
// ==================== Facility Auth ====================
authRouter.post("/facility/signup", requireAdmin, async (req, res) => {
    try {
        const data = FacilitySignupSchema.parse(req.body);
        // Check if facility already exists
        const existing = await getFacilityByEmail(data.email);
        if (existing) {
            res.status(400).json({ error: "Facility with this email already exists" });
            return;
        }
        const passwordHash = await hashPassword(data.password);
        const facility = await createFacility(data.name, data.email, passwordHash);
        res.status(201).json({
            facility: {
                id: facility.id,
                name: facility.name,
                email: facility.email,
            },
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Facility creation failed" });
    }
});
authRouter.post("/facility/login", async (req, res) => {
    try {
        const data = LoginSchema.parse(req.body);
        const facility = await getFacilityByEmail(data.email);
        if (!facility) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const isValid = await verifyPassword(data.password, facility.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const token = generateAccessToken({
            userId: facility.id,
            role: "facility",
            facilityId: facility.id,
            email: facility.email,
        });
        const refreshToken = generateRefreshToken({
            userId: facility.id,
            role: "facility",
            facilityId: facility.id,
            email: facility.email,
        });
        res.json({
            facility: {
                id: facility.id,
                name: facility.name,
                email: facility.email,
            },
            accessToken: token,
            refreshToken: refreshToken,
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: err.errors });
            return;
        }
        res.status(500).json({ error: err?.message || "Login failed" });
    }
});
// ==================== Token Refresh ====================
authRouter.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: "Refresh token required" });
            return;
        }
        const payload = verifyRefreshToken(refreshToken);
        // Generate new access token
        const newAccessToken = generateAccessToken({
            userId: payload.userId,
            role: payload.role,
            facilityId: payload.facilityId,
            email: payload.email,
        });
        res.json({
            accessToken: newAccessToken,
        });
    }
    catch (err) {
        res.status(401).json({ error: err?.message || "Invalid refresh token" });
    }
});
export { authRouter };
