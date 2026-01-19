import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "../../components/layout/Layout";
import { 
  getFacilityWallet, 
  getWalletTransactions, 
  getPricing, 
  initializePaystackTopUp,
  verifyPaystackTopUp,
  getFacilityTopUps,
  cancelTopUp,
  retryTopUpPayment,
  type WalletTransaction,
  type TopUp
} from "../../lib/api";
import { useAuth } from "../../lib/auth";

// Paystack inline JS - load dynamically
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function FacilityWallet() {
  const { token, user, onTokenRefresh } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const pageSize = 20;

  if (!token || !user) {
    return null;
  }

  // Load Paystack inline JS
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existingScript) {
      return; // Script already loaded
    }
    
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Only remove if we added it
      const scriptToRemove = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
      if (scriptToRemove && scriptToRemove === script) {
        try {
          document.body.removeChild(scriptToRemove);
        } catch (err) {
          // Script might have been removed already
          if (process.env.NODE_ENV === "development") {
            console.warn("Failed to remove Paystack script:", err);
          }
        }
      }
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current = [];
    };
  }, []);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => getFacilityWallet(token!, onTokenRefresh),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
    refetchInterval: paymentInProgress ? 3000 : false, // Poll every 3s when payment in progress
  });

  const { data: pricing } = useQuery({
    queryKey: ["pricing"],
    queryFn: () => getPricing(token!, onTokenRefresh),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", page, fromDate, toDate],
    queryFn: () =>
      getWalletTransactions(
        token!,
        {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
        onTokenRefresh
      ),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: topUpsData } = useQuery({
    queryKey: ["topups"],
    queryFn: () => getFacilityTopUps(token!, { limit: 10, offset: 0 }, onTokenRefresh),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (reference: string) => verifyPaystackTopUp(token!, reference, onTokenRefresh),
    onSuccess: () => {
      setPaymentInProgress(false);
      setPaymentReference(null);
      setTopUpAmount("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["topups"] });
      alert(t("facilityWallet.alerts.paymentSuccess"));
    },
    onError: (error: any) => {
      setPaymentInProgress(false);
      // Payment might still be processing via webhook
      // Poll for status
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["topups"] });
      }, 5000);
      timeoutRefs.current.push(timeoutId);
      if (process.env.NODE_ENV === "development") {
        console.error("Payment verification error:", error);
      }
    },
  });

  const cancelTopUpMutation = useMutation({
    mutationFn: (topUpId: string) => cancelTopUp(token!, topUpId, onTokenRefresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topups"] });
      alert(t("facilityWallet.alerts.cancelled"));
    },
    onError: (error: any) => {
      alert(error?.message || t("facilityWallet.alerts.cancelFailed"));
    },
  });

  const retryTopUpMutation = useMutation({
    mutationFn: (topUpId: string) => retryTopUpPayment(token!, topUpId, onTokenRefresh),
    onSuccess: async (data) => {
      setPaymentInProgress(true);
      setPaymentReference(data.reference);
      
      // Get Paystack public key from environment
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      
      if (!publicKey || publicKey === "pk_test_xxxxxxxxxxxxx") {
        setPaymentInProgress(false);
        alert(t("facilityWallet.alerts.paystackKeyMissing"));
        return;
      }
      
      if (!user?.email) {
        setPaymentInProgress(false);
        alert(t("facilityWallet.alerts.userEmailRequired"));
        return;
      }
      
      // Wait for Paystack script to load if needed
      if (!window.PaystackPop) {
        const timeoutId = setTimeout(() => {
          if (window.PaystackPop) {
            openPaystackPopup(publicKey, user.email, data);
          } else {
            window.location.href = data.authorizationUrl;
          }
        }, 1000);
        timeoutRefs.current.push(timeoutId);
      } else {
        openPaystackPopup(publicKey, user.email, data);
      }
    },
    onError: (error: any) => {
      setPaymentInProgress(false);
      if (process.env.NODE_ENV === "development") {
        console.error("Retry payment error:", error);
      }
      alert(error?.message || t("facilityWallet.alerts.retryFailed"));
    },
  });

  const openPaystackPopup = (publicKey: string, email: string, data: any) => {
    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email, // Use user's email
        amount: Math.round(parseFloat(topUpAmount) * 100), // Convert to pesewas
        ref: data.reference,
        currency: "GHS",
        callback: function(response: any) {
          // Payment successful - verify on backend
          verifyPaymentMutation.mutate(response.reference);
        },
        onClose: function() {
          // User closed popup
          setPaymentInProgress(false);
          alert(t("facilityWallet.alerts.paymentNotCompleted"));
        },
      });
      handler.openIframe();
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("Paystack popup error:", error);
      }
      setPaymentInProgress(false);
      // Fallback: redirect to authorization URL
      window.location.href = data.authorizationUrl;
    }
  };

  const initializePaymentMutation = useMutation({
    mutationFn: (amount: number) => initializePaystackTopUp(token!, amount, onTokenRefresh),
    onSuccess: async (data) => {
      setPaymentInProgress(true);
      setPaymentReference(data.reference);
      
      // Get Paystack public key from environment
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      
      if (!publicKey || publicKey === "pk_test_xxxxxxxxxxxxx") {
        setPaymentInProgress(false);
        alert(t("facilityWallet.alerts.paystackKeyMissing"));
        return;
      }
      
      if (!user?.email) {
        setPaymentInProgress(false);
        alert(t("facilityWallet.alerts.userEmailRequired"));
        return;
      }
      
      // Wait for Paystack script to load if needed
      if (!window.PaystackPop) {
        // Script might still be loading, wait a bit
        const timeoutId = setTimeout(() => {
          if (window.PaystackPop) {
            openPaystackPopup(publicKey, user.email, data);
          } else {
            // Fallback: redirect to authorization URL
            window.location.href = data.authorizationUrl;
          }
        }, 1000);
        timeoutRefs.current.push(timeoutId);
      } else {
        openPaystackPopup(publicKey, user.email, data);
      }
    },
    onError: (error: any) => {
      setPaymentInProgress(false);
      if (process.env.NODE_ENV === "development") {
        console.error("Payment initialization error:", error);
      }
      alert(error?.message || t("facilityWallet.alerts.initFailed"));
    },
  });

  // Check for payment success callback (after mutations are defined)
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const ref = searchParams.get("reference");
    
    if (paymentStatus === "success" && ref) {
      setPaymentReference(ref);
      // Verify payment
      verifyPaymentMutation.mutate(ref);
      // Clean up URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, verifyPaymentMutation]);

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(t("facilityWallet.alerts.invalidAmount"));
      return;
    }
    
    // Minimum top-up: ₵100.00, Maximum: ₵500.00
    if (amount < 100) {
      alert(t("facilityWallet.alerts.minAmount", { amount: "₵100.00" }));
      return;
    }
    if (amount > 500) {
      alert(t("facilityWallet.alerts.maxAmount", { amount: "₵500.00" }));
      return;
    }
    
    initializePaymentMutation.mutate(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "topup":
        return "#4caf50";
      case "deduction":
        return "#f44336";
      case "refund":
        return "#2196f3";
      case "adjustment":
        return "#ff9800";
      default:
        return "#666";
    }
  };

  const getTopUpStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "failed":
        return "#f44336";
      case "cancelled":
        return "#666";
      default:
        return "#666";
    }
  };

  const totalPages = transactionsData ? Math.ceil(transactionsData.total / pageSize) : 0;
  const currency = wallet?.currency || "GHS";
  const currencySymbol = currency === "GHS" ? "₵" : "$";

  return (
    <Layout>
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#1a1a1a" }}>
          {t("facilityWallet.title")}
        </h1>

        {/* Wallet Balance Card */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>
                {t("facilityWallet.currentBalance")}
              </h2>
              {walletLoading ? (
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#1976d2" }}>
                  {t("facilityWallet.loadingBalance")}
                </div>
              ) : (
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#1976d2" }}>
                  {currencySymbol}{Number(wallet?.balance || 0).toFixed(2)} {currency}
                </div>
              )}
            </div>
            {wallet && Number(wallet.balance || 0) < 20 && (
              <div
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#ffebee",
                  borderRadius: "8px",
                  color: "#d32f2f",
                  fontWeight: "500",
                }}
              >
                {t("facilityWallet.lowBalance")}
              </div>
            )}
          </div>

          {/* Pricing Info */}
          {pricing && (
            <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>{t("facilityWallet.analysisPricing")}</div>
              <div style={{ display: "flex", gap: "24px" }}>
                <div>
                  <span style={{ color: "#666" }}>{t("facilityWallet.pricingStandard")}:</span>{" "}
                  <span style={{ fontWeight: "600", color: "#1976d2" }}>
                    {currencySymbol}{Number(pricing.standard || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#666" }}>{t("facilityWallet.pricingImage")}:</span>{" "}
                  <span style={{ fontWeight: "600", color: "#1976d2" }}>
                    {currencySymbol}{Number(pricing.image || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top-Up Section */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>
            {t("facilityWallet.topUpTitle")}
          </h2>
          
          {paymentInProgress && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#e3f2fd",
                borderRadius: "8px",
                marginBottom: "16px",
                border: "1px solid #90caf9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "3px solid #1976d2",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div>
                  <div style={{ fontWeight: "600", color: "#1976d2" }}>{t("facilityWallet.paymentInProgress")}</div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    {paymentReference && t("facilityWallet.paymentReference", { reference: paymentReference })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            {[100, 200, 300, 400, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => setTopUpAmount(amount.toString())}
                disabled={paymentInProgress}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #1976d2",
                  borderRadius: "4px",
                  backgroundColor: topUpAmount === amount.toString() ? "#1976d2" : "#fff",
                  color: topUpAmount === amount.toString() ? "#fff" : "#1976d2",
                  cursor: paymentInProgress ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: paymentInProgress ? 0.6 : 1,
                }}
              >
                {currencySymbol}{amount}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <input
              type="number"
              placeholder={t("facilityWallet.customAmountPlaceholder", {
                symbol: currencySymbol,
                min: "100",
                max: "500",
              })}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              min="100"
              max="500"
              step="0.01"
              disabled={paymentInProgress}
              style={{
                flex: 1,
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                opacity: paymentInProgress ? 0.6 : 1,
              }}
            />
            <button
              onClick={handleTopUp}
              disabled={initializePaymentMutation.isPending || !topUpAmount || paymentInProgress}
              style={{
                padding: "12px 24px",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: initializePaymentMutation.isPending || !topUpAmount || paymentInProgress ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                opacity: initializePaymentMutation.isPending || !topUpAmount || paymentInProgress ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {initializePaymentMutation.isPending ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  {t("facilityWallet.initializing")}
                </>
              ) : (
                t("facilityWallet.payWithPaystack")
              )}
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {t("facilityWallet.securePaymentNote")}
          </div>
        </div>

        {/* Recent Top-Ups */}
        {topUpsData && topUpsData.topUps.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>
              {t("facilityWallet.recentTopUps")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topUpsData.topUps.slice(0, 5).map((topUp: TopUp) => (
                <div
                  key={topUp.id}
                  style={{
                    padding: "12px",
                    border: "1px solid #eee",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#1a1a1a", marginBottom: "4px" }}>
                      {currencySymbol}{Number(topUp.amountRequested || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {formatDate(topUp.createdAt)} • {t("facilityWallet.referenceLabel")} {topUp.paystackReference.substring(0, 12)}...
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        backgroundColor: getTopUpStatusColor(topUp.status) + "20",
                        color: getTopUpStatusColor(topUp.status),
                        fontWeight: "500",
                        textTransform: "capitalize",
                        fontSize: "12px",
                      }}
                    >
                      {topUp.status}
                    </span>
                    {topUp.status === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm(t("facilityWallet.confirmCancelTopUp"))) {
                              cancelTopUpMutation.mutate(topUp.id);
                            }
                          }}
                          disabled={cancelTopUpMutation.isPending}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid #dc2626",
                            borderRadius: "4px",
                            backgroundColor: "#fff",
                            color: "#dc2626",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: cancelTopUpMutation.isPending ? "not-allowed" : "pointer",
                            opacity: cancelTopUpMutation.isPending ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!cancelTopUpMutation.isPending) {
                              e.currentTarget.style.backgroundColor = "#fef2f2";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!cancelTopUpMutation.isPending) {
                              e.currentTarget.style.backgroundColor = "#fff";
                            }
                          }}
                        >
                          {t("facilityWallet.delete")}
                        </button>
                        <button
                          onClick={() => {
                            retryTopUpMutation.mutate(topUp.id);
                          }}
                          disabled={retryTopUpMutation.isPending}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid #1976d2",
                            borderRadius: "4px",
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: retryTopUpMutation.isPending ? "not-allowed" : "pointer",
                            opacity: retryTopUpMutation.isPending ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!retryTopUpMutation.isPending) {
                              e.currentTarget.style.backgroundColor = "#1565c0";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!retryTopUpMutation.isPending) {
                              e.currentTarget.style.backgroundColor = "#1976d2";
                            }
                          }}
                        >
                          {retryTopUpMutation.isPending ? t("facilityWallet.retrying") : t("facilityWallet.tryPayment")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>
              {t("facilityWallet.transactionHistory")}
            </h2>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          {transactionsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {t("facilityWallet.loadingTransactions")}
            </div>
          ) : !transactionsData || transactionsData.transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {t("facilityWallet.noTransactions")}
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.date")}
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.type")}
                      </th>
                      <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.amount")}
                      </th>
                      <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.balanceAfter")}
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.description")}
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#666" }}>
                        {t("facilityWallet.table.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsData.transactions.map((tx: WalletTransaction) => (
                      <tr key={tx.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#1a1a1a" }}>{formatDate(tx.createdAt)}</td>
                        <td style={{ padding: "12px", fontSize: "14px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor: getTransactionTypeColor(tx.type) + "20",
                              color: getTransactionTypeColor(tx.type),
                              fontWeight: "500",
                              textTransform: "capitalize",
                            }}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontSize: "14px",
                            textAlign: "right",
                            fontWeight: "600",
                            color: tx.type === "topup" || tx.type === "refund" ? "#4caf50" : "#f44336",
                          }}
                        >
                          {tx.type === "topup" || tx.type === "refund" ? "+" : "-"}{currencySymbol}{Number(tx.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", textAlign: "right", color: "#1a1a1a" }}>
                          {currencySymbol}{Number(tx.balanceAfter || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{tx.description || "-"}</td>
                        <td style={{ padding: "12px", fontSize: "14px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                tx.status === "completed"
                                  ? "#4caf5020"
                                  : tx.status === "failed"
                                  ? "#f4433620"
                                  : "#ff980020",
                              color:
                                tx.status === "completed"
                                  ? "#4caf50"
                                  : tx.status === "failed"
                                  ? "#f44336"
                                  : "#ff9800",
                              fontWeight: "500",
                              textTransform: "capitalize",
                            }}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "24px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#fff",
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      opacity: page === 1 ? 0.5 : 1,
                    }}
                  >
                    {t("facilityWallet.pagination.previous")}
                  </button>
                  <span style={{ fontSize: "14px", color: "#666" }}>
                    {t("facilityWallet.pagination.pageOf", { page, totalPages })}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#fff",
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                      opacity: page === totalPages ? 0.5 : 1,
                    }}
                  >
                    {t("facilityWallet.pagination.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
