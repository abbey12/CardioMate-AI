export type UserRole = "admin" | "facility";

export type JWTPayload = {
  userId: string;
  role: UserRole;
  facilityId?: string; // Only for facility users
  email: string;
};

export type Admin = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: Date;
};

export type Facility = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  referralCode?: string | null;
  referredByFacilityId?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  facilityType?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  signupCompletedAt?: Date | null;
  preferredLanguage?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

