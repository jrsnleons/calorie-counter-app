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
        process.exit(1);
    }
};

runSchema();
