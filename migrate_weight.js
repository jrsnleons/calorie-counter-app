const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "app.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Running Weight Log migration...");
    db.run(
        `CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        weight REAL,
        date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
        (err) => {
            if (err) {
                console.error("Error creating weight_logs table:", err.message);
            } else {
                console.log(
                    "Success: weight_logs table created or already exists."
                );
            }
        }
    );

    // Also migrate current user weight to first log if missing?
    // Maybe later.
});

db.close();
