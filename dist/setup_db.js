"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const runSchema = async () => {
    try {
        const schemaPath = path_1.default.join(__dirname, "../db/schema.sql");
        const schemaSql = fs_1.default.readFileSync(schemaPath, "utf-8");
        console.log("⏳ Applying schema...");
        await database_1.pool.query(schemaSql);
        console.log("✅ Schema applied successfully!");
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Error applying schema:", err);
        console.error("💡 Hint: If you are seeing 'ECONNREFUSED', it means the database connection failed.");
        console.error("   - Check if DATABASE_URL is set in your environment variables.");
        console.error("   - Ensure your database is running.");
        process.exit(1);
    }
};
runSchema();
