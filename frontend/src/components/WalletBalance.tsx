import { useQuery } from "@tanstack/react-query";
import { getFacilityWallet } from "../lib/api";
import { useAuth } from "../lib/auth";

export function WalletBalance() {
  const { token, onTokenRefresh } = useAuth();

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return getFacilityWallet(token, onTokenRefresh);
    },
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: "#666" }}>Balance:</span>
        <span style={{ fontSize: "14px", color: "#666" }}>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: "#d32f2f" }}>Error loading balance</span>
      </div>
    );
  }

  const balance = wallet?.balance || 0;
  const isLowBalance = balance < 10;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "14px", color: "#666" }}>Balance:</span>
      <span
        style={{
          fontSize: "16px",
          fontWeight: "600",
          color: isLowBalance ? "#dc2626" : "#2563eb",
        }}
      >
        {wallet?.currency === "GHS" ? "₵" : "$"}{balance.toFixed(2)} {wallet?.currency || "GHS"}
      </span>
      {isLowBalance && (
        <span
          style={{
            fontSize: "12px",
            color: "#d32f2f",
            padding: "2px 8px",
            backgroundColor: "#ffebee",
            borderRadius: "4px",
          }}
        >
          Low
        </span>
      )}
    </div>
  );
}

