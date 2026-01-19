import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { AuthResponse } from "./api";
import { refreshAccessToken as refreshTokenAPI } from "./api";

type UserRole = "admin" | "facility";

type User = {
  id: string;
  email: string;
  role: UserRole;
  facilityId?: string;
  name?: string;
  facilityName?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (response: AuthResponse) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  onTokenRefresh?: (newToken: string) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFacility: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Listen for storage events to sync token across tabs and when refreshed
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" && e.newValue) {
        setToken(e.newValue);
      }
    };
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === "accessToken" && customEvent.detail?.newValue) {
        setToken(customEvent.detail.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("tokenRefresh", handleCustomStorage as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tokenRefresh", handleCustomStorage as EventListener);
    };
  }, []);

  const login = (response: AuthResponse) => {
    const accessToken = response.accessToken;
    const refreshToken = response.refreshToken;

    let userData: User;
    if (response.admin) {
      userData = {
        id: response.admin.id,
        email: response.admin.email,
        role: "admin",
        name: response.admin.name,
      };
    } else if (response.facility) {
      userData = {
        id: response.facility.id,
        email: response.facility.email,
        role: "facility",
        facilityId: response.facility.id,
        facilityName: response.facility.name,
      };
    } else {
      throw new Error("Invalid auth response");
    }

    setToken(accessToken);
    setUser(userData);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const refreshToken = async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      logout();
      return false;
    }

    try {
      const response = await refreshTokenAPI(storedRefreshToken);
      const newToken = response.accessToken;
      setToken(newToken);
      localStorage.setItem("accessToken", newToken);
      return true;
    } catch (error) {
      // Refresh failed, logout user
      logout();
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  };

  const onTokenRefresh = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("accessToken", newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshToken,
        onTokenRefresh,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === "admin",
        isFacility: user?.role === "facility",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

