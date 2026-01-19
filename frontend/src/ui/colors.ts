/**
 * Cardiology Color Scheme
 * Red, Blue, and White - representing cardiology
 */

export const COLORS = {
  // Primary Colors
  RED: "#dc2626",        // Cardiology red - primary actions, alerts, critical
  BLUE: "#2563eb",       // Cardiology blue - secondary actions, links, info
  WHITE: "#ffffff",      // Background, cards, text on colored backgrounds
  
  // Red Variants
  RED_LIGHT: "#fef2f2",  // Light red background
  RED_DARK: "#b91c1c",   // Dark red for hover states
  RED_BORDER: "#fecaca", // Red border
  
  // Blue Variants
  BLUE_LIGHT: "#eff6ff", // Light blue background
  BLUE_DARK: "#1d4ed8",  // Dark blue for hover states
  BLUE_BORDER: "#bfdbfe", // Blue border
  
  // Neutral Colors (for text, borders, backgrounds)
  GRAY_50: "#f8fafc",
  GRAY_100: "#f1f5f9",
  GRAY_200: "#e2e8f0",
  GRAY_300: "#cbd5e1",
  GRAY_400: "#94a3b8",
  GRAY_500: "#64748b",
  GRAY_600: "#475569",
  GRAY_700: "#334155",
  GRAY_800: "#1e293b",
  GRAY_900: "#0f172a",
  
  // Status Colors (using red/blue/white theme)
  SUCCESS: "#16a34a",    // Green for success (can be changed to blue if preferred)
  WARNING: "#f59e0b",     // Orange for warnings (can be changed to red if preferred)
  ERROR: "#dc2626",       // Red for errors
  INFO: "#2563eb",        // Blue for info
} as const;

// Color usage guidelines
export const COLOR_USAGE = {
  // Primary Actions - Use RED for cardiology
  PRIMARY: COLORS.RED,
  PRIMARY_HOVER: COLORS.RED_DARK,
  PRIMARY_BACKGROUND: COLORS.RED_LIGHT,
  PRIMARY_BORDER: COLORS.RED_BORDER,
  
  // Secondary Actions - Use BLUE
  SECONDARY: COLORS.BLUE,
  SECONDARY_HOVER: COLORS.BLUE_DARK,
  SECONDARY_BACKGROUND: COLORS.BLUE_LIGHT,
  SECONDARY_BORDER: COLORS.BLUE_BORDER,
  
  // Backgrounds
  BACKGROUND: COLORS.WHITE,
  BACKGROUND_ALT: COLORS.GRAY_50,
  
  // Text
  TEXT_PRIMARY: COLORS.GRAY_800,
  TEXT_SECONDARY: COLORS.GRAY_500,
  TEXT_MUTED: COLORS.GRAY_400,
  
  // Borders
  BORDER: COLORS.GRAY_200,
  BORDER_LIGHT: COLORS.GRAY_100,
} as const;

