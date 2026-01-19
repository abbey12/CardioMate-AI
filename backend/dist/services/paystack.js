// Paystack SDK - using direct API calls instead of SDK due to compatibility
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";
// Helper function to make Paystack API requests
async function paystackRequest(endpoint, method = "GET", body) {
    const url = `${PAYSTACK_BASE_URL}${endpoint}`;
    const headers = {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
    };
    const options = {
        method,
        headers,
    };
    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.message || `Paystack API error: ${response.statusText}`;
            console.error("Paystack API error:", {
                endpoint,
                status: response.status,
                statusText: response.statusText,
                message: errorMsg,
                data: data
            });
            throw new Error(errorMsg);
        }
        return data;
    }
    catch (error) {
        if (error.message && error.message.includes("Paystack API error")) {
            throw error; // Re-throw Paystack API errors
        }
        console.error("Paystack request error:", {
            endpoint,
            error: error.message || error.toString()
        });
        throw new Error(`Failed to connect to Paystack: ${error.message || error.toString()}`);
    }
}
/**
 * Initialize a Paystack transaction for wallet top-up
 */
export async function initializeTopUp(amount, // Amount in Ghana Cedis
facility, metadata) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error("Paystack secret key not configured");
    }
    // Convert GHS to pesewas (1 GHS = 100 pesewas)
    const amountInPesewas = Math.round(amount * 100);
    // Minimum amount check (₵10 = 1000 pesewas)
    if (amountInPesewas < 1000) {
        throw new Error("Minimum top-up amount is ₵10.00");
    }
    try {
        const response = await paystackRequest("/transaction/initialize", "POST", {
            amount: amountInPesewas,
            email: facility.email,
            currency: "GHS",
            metadata: {
                facility_id: facility.id,
                facility_name: facility.name || "Facility",
                ...metadata,
            },
            callback_url: process.env.PAYSTACK_CALLBACK_URL || `${process.env.FRONTEND_URL || "http://localhost:5173"}/facility/wallet?payment=success`,
        });
        if (!response.status || !response.data) {
            throw new Error("Invalid response from Paystack API");
        }
        return response;
    }
    catch (error) {
        console.error("Paystack initialization error:", error);
        throw new Error(error?.message || "Failed to initialize Paystack payment");
    }
}
/**
 * Verify a Paystack transaction
 */
export async function verifyTransaction(reference) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error("Paystack secret key not configured");
    }
    try {
        const response = await paystackRequest(`/transaction/verify/${reference}`, "GET");
        return response;
    }
    catch (error) {
        console.error("Paystack verification error:", error);
        throw new Error(error?.message || "Failed to verify Paystack transaction");
    }
}
/**
 * Verify Paystack webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
    if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
        console.warn("Paystack webhook secret not configured, skipping verification");
        return true; // Allow in development if not configured
    }
    const crypto = require("crypto");
    const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");
    return hash === signature;
}
/**
 * Convert pesewas to Ghana Cedis
 */
export function pesewasToGhs(pesewas) {
    return pesewas / 100;
}
/**
 * Convert Ghana Cedis to pesewas
 */
export function ghsToPesewas(ghs) {
    return Math.round(ghs * 100);
}
