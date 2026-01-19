import express from "express";
import { z } from "zod";
import crypto from "crypto";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { 
  createAdmin, 
  getAdminByEmail,
  getAdminById,
  getFacilityByEmail,
  getFacilityById,
  createFacility,
  getPlatformSetting,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updateAdminPassword,
  updateFacilityPasswordForReset,
  createAdminAuditLog,
} from "../services/db.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

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
  referralCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

// ==================== Admin Auth ====================

authRouter.post("/admin/signup", async (req, res): Promise<void> => {
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Signup failed" });
  }
});

authRouter.post("/admin/login", async (req, res): Promise<void> => {
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Login failed" });
  }
});

// ==================== Facility Auth ====================

authRouter.post("/facility/signup-public", async (req, res): Promise<void> => {
  try {
    const data = FacilitySignupSchema.parse(req.body);

    if (!data.country) {
      res.status(400).json({ error: "Country is required" });
      return;
    }

    // Check if facility already exists
    const existing = await getFacilityByEmail(data.email);
    if (existing) {
      res.status(400).json({ error: "Facility with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const facility = await createFacility(
      data.name,
      data.email,
      passwordHash,
      data.referralCode || null,
      data.country
    );

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

    res.status(201).json({
      facility: {
        id: facility.id,
        name: facility.name,
        email: facility.email,
      },
      accessToken: token,
      refreshToken: refreshToken,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Facility signup failed" });
  }
});

authRouter.get("/default-language", async (req, res): Promise<void> => {
  try {
    const language = await getPlatformSetting("default_language");
    res.json({ language: language?.settingValue?.language || "en" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch default language" });
  }
});

authRouter.post("/facility/signup", requireAdmin, async (req, res): Promise<void> => {
  try {
    const data = FacilitySignupSchema.parse(req.body);

    // Check if facility already exists
    const existing = await getFacilityByEmail(data.email);
    if (existing) {
      res.status(400).json({ error: "Facility with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const facility = await createFacility(
      data.name,
      data.email,
      passwordHash,
      data.referralCode || null,
      data.country || null
    );

    await createAdminAuditLog({
      adminId: req.user?.userId,
      action: "facility.create",
      entityType: "facility",
      entityId: facility.id,
      metadata: { name: facility.name, email: facility.email, referralCode: data.referralCode || null },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      facility: {
        id: facility.id,
        name: facility.name,
        email: facility.email,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Facility creation failed" });
  }
});

authRouter.post("/facility/login", async (req, res): Promise<void> => {
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Login failed" });
  }
});

// ==================== Unified Login ====================

authRouter.post("/login", async (req, res): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);

    // Try admin first
    const admin = await getAdminByEmail(data.email);
    if (admin) {
      const isValid = await verifyPassword(data.password, admin.passwordHash);
      if (isValid) {
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
        return;
      }
    }

    // Try facility
    const facility = await getFacilityByEmail(data.email);
    if (facility) {
      const isValid = await verifyPassword(data.password, facility.passwordHash);
      if (isValid) {
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
        return;
      }
    }

    // If we get here, neither admin nor facility matched
    res.status(401).json({ error: "Invalid email or password" });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Login failed" });
  }
});

// ==================== Token Refresh ====================

authRouter.post("/refresh", async (req, res): Promise<void> => {
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
  } catch (err: any) {
    res.status(401).json({ error: err?.message || "Invalid refresh token" });
  }
});

// ==================== Password Reset ====================

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

// Request password reset
authRouter.post("/forgot-password", async (req, res): Promise<void> => {
  try {
    const data = ForgotPasswordSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    // Try to find user (admin or facility)
    const admin = await getAdminByEmail(email);
    const facility = await getFacilityByEmail(email);

    if (!admin && !facility) {
      // Don't reveal if email exists for security
      res.json({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const userType = admin ? "admin" : "facility";
    const userName = admin?.name || facility?.name;

    // Create reset token in database
    await createPasswordResetToken(email, resetToken, userType, 1); // 1 hour expiry

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken, userName);
    } catch (emailError: any) {
      console.error("Failed to send password reset email:", emailError);
      // Still return success to not reveal if email exists
    }

    res.json({ 
      success: true, 
      message: "If an account exists with this email, a password reset link has been sent." 
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to process password reset request" });
  }
});

// Reset password with token
authRouter.post("/reset-password", async (req, res): Promise<void> => {
  try {
    const data = ResetPasswordSchema.parse(req.body);

    // Get reset token
    const resetToken = await getPasswordResetToken(data.token);
    if (!resetToken) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    // Check if token is used
    if (resetToken.used) {
      res.status(400).json({ error: "This reset token has already been used" });
      return;
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      res.status(400).json({ error: "Reset token has expired. Please request a new one." });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.password);

    // Update password based on user type
    if (resetToken.userType === "admin") {
      const admin = await getAdminByEmail(resetToken.email);
      if (!admin) {
        res.status(400).json({ error: "User not found" });
        return;
      }
      await updateAdminPassword(admin.id, newPasswordHash);
    } else {
      const facility = await getFacilityByEmail(resetToken.email);
      if (!facility) {
        res.status(400).json({ error: "User not found" });
        return;
      }
      await updateFacilityPasswordForReset(facility.id, newPasswordHash);
    }

    // Mark token as used
    await markPasswordResetTokenAsUsed(data.token);

    res.json({ 
      success: true, 
      message: "Password has been reset successfully. You can now login with your new password." 
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to reset password" });
  }
});

// Change password (when logged in) - requires authentication
authRouter.post("/change-password", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    const user = req.user!;
    const userId = user.userId;
    const userRole = user.role;

    // Get current user
    let currentUser: { passwordHash: string } | null = null;
    if (userRole === "admin") {
      const admin = await getAdminById(userId);
      if (!admin) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      currentUser = admin;
    } else if (userRole === "facility") {
      const facility = await getFacilityById(userId);
      if (!facility) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      currentUser = facility;
    } else {
      res.status(403).json({ error: "Invalid user role" });
      return;
    }

    // Verify current password
    const isValid = await verifyPassword(data.currentPassword, currentUser.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.newPassword);

    // Update password
    if (userRole === "admin") {
      await updateAdminPassword(userId, newPasswordHash);
    } else {
      await updateFacilityPasswordForReset(userId, newPasswordHash);
    }

    res.json({ 
      success: true, 
      message: "Password has been changed successfully" 
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    res.status(500).json({ error: err?.message || "Failed to change password" });
  }
});

export { authRouter };

