const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "app.db");
const db = new sqlite3.Database(dbPath);

console.log("Running manual migrations...");

db.serialize(() => {
    // Add columns if they don't exist
    const columns = [
        "ALTER TABLE users ADD COLUMN name TEXT",
        "ALTER TABLE users ADD COLUMN avatar TEXT",
        "ALTER TABLE users ADD COLUMN height INTEGER",
        "ALTER TABLE users ADD COLUMN weight INTEGER",
        "ALTER TABLE users ADD COLUMN age INTEGER",
        "ALTER TABLE users ADD COLUMN gender TEXT",
        "ALTER TABLE users ADD COLUMN activity_level TEXT",
        "ALTER TABLE users ADD COLUMN goal TEXT",
        "ALTER TABLE users ADD COLUMN tdee INTEGER",
        "ALTER TABLE meals ADD COLUMN meal_type TEXT",
    ];

    columns.forEach((col) => {
        db.run(col, (err) => {
            if (err && !err.message.includes("duplicate column")) {
                console.log(
                    `Migration ignored (exists?): ${col.split("ADD")[1]}`
                );
            } else if (!err) {
                console.log(`Success: ${col}`);
            }
        });
    });
});

db.close(() => console.log("Migrations complete."));
