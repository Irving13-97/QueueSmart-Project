import { describe, it, expect } from 'vitest';
import db from '../database/db.js';

describe('SQLite Database Integration', () => {

  it('stores and retrieves a service', () => {
    const result = db.prepare(`
      INSERT INTO Service
        (service_name, description, expected_duration, priority_level)
      VALUES (?, ?, ?, ?)
    `).run('Database Test Service', 'SQLite persistence test', 25, 'medium');

    const service = db.prepare(`
      SELECT * FROM Service WHERE service_id = ?
    `).get(result.lastInsertRowid);

    expect(service.service_name).toBe('Database Test Service');
    expect(service.expected_duration).toBe(25);
    expect(service.priority_level).toBe('medium');

    db.prepare('DELETE FROM Service WHERE service_id = ?')
      .run(result.lastInsertRowid);
  });

  it('updates an existing service in SQLite', () => {
    const result = db.prepare(`
      INSERT INTO Service
        (service_name, description, expected_duration, priority_level)
      VALUES (?, ?, ?, ?)
    `).run('Original Service', 'Before update', 20, 'low');

    db.prepare(`
      UPDATE Service
      SET service_name = ?, expected_duration = ?
      WHERE service_id = ?
    `).run('Updated Service', 35, result.lastInsertRowid);

    const service = db.prepare(`
      SELECT * FROM Service WHERE service_id = ?
    `).get(result.lastInsertRowid);

    expect(service.service_name).toBe('Updated Service');
    expect(service.expected_duration).toBe(35);

    db.prepare('DELETE FROM Service WHERE service_id = ?')
      .run(result.lastInsertRowid);
  });

  it('rejects services with missing required fields', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO Service (service_name, expected_duration)
        VALUES (?, ?)
      `).run(null, 15);
    }).toThrow();
  });

  it('rejects a service with a negative duration', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO Service (service_name, expected_duration)
        VALUES (?, ?)
      `).run('Invalid Service', -10);
    }).toThrow();
  });

  it('rejects invalid priority levels', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO Service
          (service_name, expected_duration, priority_level)
        VALUES (?, ?, ?)
      `).run('Invalid Priority', 20, 'urgent');
    }).toThrow();
  });

  it('enforces foreign-key relationships', () => {
    expect(() => {
      db.prepare(`
        INSERT INTO Queue (service_id)
        VALUES (?)
      `).run(999999);
    }).toThrow();
  });

});
