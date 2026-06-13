const sqlite3 = require("sqlite3").verbose();
const dbFile = process.env.DATABASE_FILE || "database.sqlite";

const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("❌ SQLite database connection error:", err.message);
    } else {
        console.log(`📂 SQLite database connected: ${dbFile}`);
        // Create messages table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                role TEXT NOT NULL, -- 'user' or 'bot'
                text TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

module.exports = db;
