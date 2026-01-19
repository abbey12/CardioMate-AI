import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDatabase } from "./db/connection.js";
import { initializeDefaultPricing, getTopUpByReference, verifyTopUp, markTopUpFailed } from "./services/db.js";
import { verifyWebhookSignature, pesewasToGhs } from "./services/paystack.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { facilityRouter } from "./routes/facility.js";
const app = express();
// Middleware (webhook needs raw body, so we handle it separately)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = Number(process.env.PORT ?? 4000);
const defaultCorsAllowlist = ["http://localhost:5173", "http://127.0.0.1:5173"];
const envCorsAllowlist = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const corsAllowlist = Array.from(new Set([...defaultCorsAllowlist, ...envCorsAllowlist]));
app.use(cors({
    origin(origin, cb) {
        // allow non-browser clients (curl/postman)
        if (!origin)
            return cb(null, true);
        if (corsAllowlist.includes(origin))
            return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
// Health check
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
// Routes
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/facility", facilityRouter);
// Paystack webhook (needs raw body for signature verification)
// This must be registered before the JSON middleware processes it
app.post("/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const signature = req.headers["x-paystack-signature"];
        if (!signature) {
            res.status(400).json({ error: "Missing signature" });
            return;
        }
        // Verify webhook signature
        const payload = req.body.toString();
        const { verifyWebhookSignature, pesewasToGhs } = await import("./services/paystack.js");
        const { getTopUpByReference, verifyTopUp, markTopUpFailed } = await import("./services/db.js");
        if (!verifyWebhookSignature(payload, signature)) {
            res.status(401).json({ error: "Invalid signature" });
            return;
        }
        const event = JSON.parse(payload);
        // Handle charge.success event
        if (event.event === "charge.success") {
            const { reference, amount, status } = event.data;
            if (status === "success") {
                // Get top-up record
                const topUp = await getTopUpByReference(reference);
                if (topUp && topUp.status === "pending") {
                    const amountReceived = pesewasToGhs(amount);
                    // Verify and update wallet
                    const result = await verifyTopUp(reference, amountReceived);
                    if (result.success) {
                        console.log(`✅ Top-up verified: ${reference}, Amount: ₵${amountReceived}`);
                        res.json({ received: true });
                    }
                    else {
                        console.error(`❌ Failed to verify top-up: ${reference}`, result.error);
                        res.status(500).json({ error: result.error });
                    }
                }
                else {
                    console.log(`⚠️ Top-up already processed: ${reference}`);
                    res.json({ received: true }); // Idempotent - already processed
                }
            }
            else {
                // Payment failed
                await markTopUpFailed(reference, "Payment failed");
                res.json({ received: true });
            }
        }
        else {
            // Other events - just acknowledge
            res.json({ received: true });
        }
    }
    catch (err) {
        console.error("Webhook error:", err);
        res.status(500).json({ error: err?.message || "Webhook processing failed" });
    }
});
// Paystack webhook (needs raw body for signature verification)
app.post("/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const signature = req.headers["x-paystack-signature"];
        if (!signature) {
            res.status(400).json({ error: "Missing signature" });
            return;
        }
        // Verify webhook signature
        const payload = req.body.toString();
        if (!verifyWebhookSignature(payload, signature)) {
            res.status(401).json({ error: "Invalid signature" });
            return;
        }
        const event = JSON.parse(payload);
        // Handle charge.success event
        if (event.event === "charge.success") {
            const { reference, amount, status } = event.data;
            if (status === "success") {
                // Get top-up record
                const topUp = await getTopUpByReference(reference);
                if (topUp && topUp.status === "pending") {
                    const amountReceived = pesewasToGhs(amount);
                    // Verify and update wallet
                    const result = await verifyTopUp(reference, amountReceived);
                    if (result.success) {
                        console.log(`✅ Top-up verified: ${reference}, Amount: ₵${amountReceived}`);
                        res.json({ received: true });
                    }
                    else {
                        console.error(`❌ Failed to verify top-up: ${reference}`, result.error);
                        res.status(500).json({ error: result.error });
                    }
                }
                else {
                    console.log(`⚠️ Top-up already processed: ${reference}`);
                    res.json({ received: true }); // Idempotent - already processed
                }
            }
            else {
                // Payment failed
                await markTopUpFailed(reference, "Payment failed");
                res.json({ received: true });
            }
        }
        else {
            // Other events - just acknowledge
            res.json({ received: true });
        }
    }
    catch (err) {
        console.error("Webhook error:", err);
        res.status(500).json({ error: err?.message || "Webhook processing failed" });
    }
});
// Initialize database and start server
async function start() {
    try {
        await initDatabase();
        await initializeDefaultPricing();
        app.listen(port, () => {
            console.log(`✅ Backend listening on http://localhost:${port}`);
            console.log(`📊 Database connected`);
            console.log(`💰 Wallet system initialized`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}
start();
