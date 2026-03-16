const Database = require('better-sqlite3');
const path = require('path');
const env = require('./env');

const dbPath = path.resolve(env.DB_PATH);
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
