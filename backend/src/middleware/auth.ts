import type { Request, Response, NextFunction } from "express";
import { extractTokenFromHeader, verifyAccessToken } from "../utils/auth.js";
import type { JWTPayload } from "../types/auth.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      facilityId?: string;
    }
  }
}

/**
 * Middleware to require authentication
 * Adds user info to req.user
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Invalid token" });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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
export function requireFacility(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

