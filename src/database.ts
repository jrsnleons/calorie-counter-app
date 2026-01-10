import dotenv from "dotenv";
import { Pool, QueryResult } from "pg";

dotenv.config();

// Use connection string from environment or default to local (for testing compatibility)
// On Neon/Render, DATABASE_URL will be provided.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.DATABASE_URL &&
        process.env.DATABASE_URL.includes("localhost")
            ? false
            : { rejectUnauthorized: false },
});

export const query = (text: string, params?: any[]): Promise<QueryResult> =>
    pool.query(text, params);
export { pool };
