"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.query = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
dotenv_1.default.config();
// Use connection string from environment or default to local (for testing compatibility)
// On Neon/Render, DATABASE_URL will be provided.
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined! Defaulting to localhost behavior which may fail.");
}
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL &&
        process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
});
exports.pool = pool;
const query = (text, params) => pool.query(text, params);
exports.query = query;
