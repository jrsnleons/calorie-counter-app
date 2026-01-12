import fs from "fs";
import path from "path";
import { pool } from "./database";

const runSchema = async () => {
    try {
        const schemaPath = path.join(__dirname, "../db/schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");

        console.log("⏳ Applying schema...");
        await pool.query(schemaSql);
        console.log("✅ Schema applied successfully!");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error applying schema:", err);
        console.error(
            "💡 Hint: If you are seeing 'ECONNREFUSED', it means the database connection failed."
        );
        console.error(
            "   - Check if DATABASE_URL is set in your environment variables."
        );
        console.error("   - Ensure your database is running.");
        process.exit(1);
    }
};

runSchema();
