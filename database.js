const { Pool } = require("pg");
require("dotenv").config();

// Use connection string from environment or default to local (for testing compatibility)
// On Neon/Render, DATABASE_URL will be provided.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

const initializeDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                avatar TEXT,
                height INTEGER,
                weight INTEGER,
                age INTEGER,
                gender TEXT,
                activity_level TEXT,
                goal TEXT,
                tdee INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS meals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                food_name TEXT,
                calories INTEGER,
                protein TEXT,
                carbs TEXT,
                fat TEXT,
                items TEXT,
                meal_type TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS weight_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                weight REAL,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Session table is handled by connect-pg-simple, but good to have explicit SQL just in case
        await pool.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid varchar NOT NULL COLLATE "default",
                sess json NOT NULL,
                expire timestamp(6) NOT NULL
            )
            WITH (OIDS=FALSE);
        `);
        // Add constraint separately to avoid error if it exists
        try {
             await pool.query(`ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
        } catch (e) { /* ignore if exists */ }

        await pool.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON session ("expire");`);

        console.log("Database initialized successfully");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
};

// Run init
initializeDB();

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
};
