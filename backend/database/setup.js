import db from './db.js';
import { readFileSync } from 'fs';

// Read the SQL commands from schema.sql
const schema = readFileSync(
    new URL('./schema.sql', import.meta.url),
    'utf8'
);

// Execute the commands to create the tables
db.exec(schema);

console.log('QueueSmart database tables created successfully!');

// Display the tables that were created
const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
`).all();

console.log('Database tables:');
console.table(tables);

// Close the database connection
db.close();
