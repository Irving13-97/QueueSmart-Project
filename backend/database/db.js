import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(
    path.join(__dirname, 'queuesmart.db')
);

db.pragma('foreign_keys = ON');

console.log('Connected to QueueSmart database!');

export default db;
