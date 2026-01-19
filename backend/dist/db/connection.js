import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});
// Test connection
pool.on("connect", () => {
    console.log("✅ Database connected");
});
pool.on("error", (err) => {
    console.error("❌ Database connection error:", err);
});
export async function query(text, params) {
    return pool.query(text, params);
}
export async function getClient() {
    return pool.connect();
}
// Initialize database (run schema if needed)
export async function initDatabase() {
    try {
        // Test connection
        await query("SELECT NOW()");
        console.log("✅ Database initialized");
    }
    catch (error) {
        console.error("❌ Database initialization failed:", error);
        throw error;
    }
}
export default pool;
