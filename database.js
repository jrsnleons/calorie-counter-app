const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "app.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Attempt to add new columns if table already exists (schema migration)
    db.run("ALTER TABLE users ADD COLUMN name TEXT", (err) => {});
    db.run("ALTER TABLE users ADD COLUMN avatar TEXT", (err) => {});

    // Meals Table - NEW COLUMN: 'items' (TEXT)
    db.run(`CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        food_name TEXT,
        calories INTEGER,
        protein TEXT,
        carbs TEXT,
        fat TEXT,
        items TEXT,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

module.exports = {
    all: (query, params) =>
        new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
    get: (query, params) =>
        new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }),
    run: (query, params) =>
        new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        }),
};
