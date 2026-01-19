import { extractTokenFromHeader, verifyAccessToken } from "../utils/auth.js";
/**
 * Middleware to require authentication
 * Adds user info to req.user
 */
export function requireAuth(req, res, next) {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        const payload = verifyAccessToken(token);
        req.user = payload;
        req.facilityId = payload.facilityId;
        next();
    }
    catch (error) {
        res.status(401).json({ error: error.message || "Invalid token" });
    }
}
/**
 * Middleware to require admin role
 */
export function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        next();
    });
}
/**
 * Middleware to require facility role
 */
export function requireFacility(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== "facility") {
            res.status(403).json({ error: "Facility access required" });
            return;
        }
        if (!req.user.facilityId) {
            res.status(403).json({ error: "Facility ID missing" });
            return;
        }
        next();
    });
}
