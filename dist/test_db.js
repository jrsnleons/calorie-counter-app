"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
async function testConnection() {
    try {
        console.log("Attempting to connect to database...");
        // Test connection
        const res = await (0, database_1.query)("SELECT NOW()");
        console.log("✅ Connection successful!");
        console.log("   Current Database Time:", res.rows[0].now);
        // Check if tables allow access
        console.log("\nChecking tables...");
        const tables = await (0, database_1.query)(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        const tableNames = tables.rows.map((r) => r.table_name);
        if (tableNames.length > 0) {
            console.log("✅ Tables found:", tableNames.join(", "));
        }
        else {
            console.log("⚠️  No tables found. They will be created when the server starts.");
        }
        // Test database initialization by calling it manually if we want,
        // but server.js does this automatically. We can check if 'users' exists specifically.
        if (tableNames.includes("users")) {
            const userCount = await (0, database_1.query)("SELECT COUNT(*) FROM users");
            console.log("   User count:", userCount.rows[0].count);
        }
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    }
}
testConnection();
