import db from './db.js';

const insertService = db.prepare(`
    INSERT INTO Service
    (service_name, description, expected_duration, priority_level)
    VALUES (?, ?, ?, ?)
`);

const services = [
    ['Express Oil Change', 'A quick oil change service', 15, 'medium'],
    ['Full Synthetic Service', 'Full synthetic oil change', 30, 'medium'],
    ['Tire Rotation & Inspection', 'Tire rotation and vehicle inspection', 20, 'low']
];

const count = db.prepare('SELECT COUNT(*) AS total FROM Service').get();

if (count.total === 0) {
    const insertAll = db.transaction(() => {
        for (const service of services) {
            insertService.run(...service);
        }
    });

    insertAll();
    console.log('Three QueueSmart services added successfully!');
} else {
    console.log('Services already exist. No new services added.');
}

console.table(db.prepare('SELECT * FROM Service').all());

db.close();
