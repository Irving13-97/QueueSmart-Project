import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import db from '../database/db.js';
import { resetUsers } from '../auth.js';
import {
  resetNotifications,
  createNotification,
  getNotifications,
  markNotificationViewed,
  notifyJoined,
  notifyCloseToServed
} from '../notifications.js';

const ADMIN_ID = 1;
const service = { id: 1, name: 'Test Service' };

async function createService() {
  const res = await request(app).post('/api/services').send({
    name: 'Notification Test Service',
    description: 'Used by tests',
    duration: 10,
    priority: 'low'
  });
  return res.body.service;
}

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Tester',
    email,
    password: 'secret123'
  });
  return res.body.user;
}

beforeEach(() => {
  resetUsers();
  resetNotifications();
});

describe('notification logic', () => {
  it('creates notifications with an id, timestamp, and sent status', () => {
    const note = createNotification({ userId: ADMIN_ID, type: 'status', message: 'Hello' });

    expect(note.id).toBe(1);
    expect(note.createdAt).toBeTypeOf('string');
    expect(note.customerId).toBeNull();
    expect(note.status).toBe('sent');
  });

  it('returns newest notifications first and filters by user', async () => {
    const other = await registerUser('other@example.com');
    createNotification({ userId: ADMIN_ID, type: 'status', message: 'first' });
    createNotification({ userId: other.id, type: 'status', message: 'other user' });
    createNotification({ userId: ADMIN_ID, type: 'status', message: 'second' });

    expect(getNotifications(ADMIN_ID).map(note => note.message)).toEqual(['second', 'first']);
    expect(getNotifications()).toHaveLength(3);
  });

  it('builds a joined message with the position', async () => {
    const user = await registerUser('joined@example.com');
    const note = notifyJoined({ id: 5, userId: user.id, position: 4 }, service);

    expect(note.type).toBe('joined');
    expect(note.userId).toBe(user.id);
    expect(note.message).toContain('Test Service');
    expect(note.message).toContain('#4');
  });

  it('uses a null user id for guests', () => {
    const note = notifyJoined({ id: 5, position: 1 }, service);

    expect(note.userId).toBeNull();
  });

  it('notifies only the first two customers', () => {
    const queue = {
      customers: [{ id: 1 }, { id: 2 }, { id: 3 }]
    };

    const created = notifyCloseToServed(queue, service);

    expect(created.map(note => note.customerId)).toEqual([1, 2]);
    expect(created[0].message).toMatch(/next in line/);
    expect(created[1].message).toMatch(/almost ready/);
  });

  it('does not notify the same customer twice', () => {
    const queue = { customers: [{ id: 1 }, { id: 2 }] };

    notifyCloseToServed(queue, service);
    const second = notifyCloseToServed(queue, service);

    expect(second).toHaveLength(0);
  });

  it('marks a notification as viewed', () => {
    const note = createNotification({ userId: ADMIN_ID, type: 'status', message: 'Read me' });

    expect(markNotificationViewed(note.id).status).toBe('viewed');
  });
});

describe('notification persistence', () => {
  it('stores notifications in the Notification table', () => {
    const note = createNotification({ userId: ADMIN_ID, serviceId: 1, type: 'status', message: 'Saved' });

    const row = db.prepare('SELECT * FROM Notification WHERE notification_id = ?').get(note.id);

    expect(row).toMatchObject({
      user_id: ADMIN_ID,
      service_id: 1,
      type: 'status',
      message: 'Saved',
      status: 'sent'
    });
  });

  it('rejects a notification for a user that does not exist', () => {
    expect(() => createNotification({ userId: 999, type: 'status', message: 'Hi' })).toThrow(/FOREIGN KEY/);
  });

  it('rejects an unknown notification type', () => {
    expect(() => createNotification({ type: 'spam', message: 'Hi' })).toThrow(/CHECK/);
  });

  it('keeps notifications but clears the service when the service is deleted', async () => {
    const newService = await createService();
    const note = createNotification({ serviceId: newService.id, type: 'status', message: 'Service note' });

    await request(app).delete(`/api/services/${newService.id}`);

    const row = db.prepare('SELECT service_id FROM Notification WHERE notification_id = ?').get(note.id);
    expect(row.service_id).toBeNull();
  });
});

describe('queue triggers', () => {
  it('notifies a user when they join a queue', async () => {
    const newService = await createService();
    const user = await registerUser('join@example.com');

    const res = await request(app)
      .post(`/api/queues/${newService.id}/join`)
      .send({ customerName: 'Tester', userId: user.id });

    expect(res.status).toBe(201);
    expect(res.body.customer.userId).toBe(user.id);

    const notes = getNotifications(user.id);
    expect(notes.map(note => note.type)).toEqual(['almost_ready', 'joined']);
  });

  it('notifies the next customers after serve next', async () => {
    const newService = await createService();
    const join = name => request(app)
      .post(`/api/queues/${newService.id}/join`)
      .send({ customerName: name });

    await join('A');
    await join('B');
    const third = await join('C');

    expect(getNotifications().filter(note => note.customerId === third.body.customer.id && note.type === 'almost_ready')).toHaveLength(0);

    await request(app).post(`/api/queues/${newService.id}/serve-next`);

    expect(getNotifications().filter(note => note.customerId === third.body.customer.id && note.type === 'almost_ready')).toHaveLength(1);
  });

  it('notifies the next customer when someone leaves', async () => {
    const newService = await createService();
    const join = name => request(app)
      .post(`/api/queues/${newService.id}/join`)
      .send({ customerName: name });

    const first = await join('A');
    await join('B');
    const third = await join('C');

    await request(app).delete(`/api/queues/${newService.id}/leave/${first.body.customer.id}`);

    expect(getNotifications().some(note => note.customerId === third.body.customer.id && note.type === 'almost_ready')).toBe(true);
  });

  it('rejects joining with an unknown user id', async () => {
    const newService = await createService();

    const res = await request(app)
      .post(`/api/queues/${newService.id}/join`)
      .send({ customerName: 'Tester', userId: 999 });

    expect(res.status).toBe(404);
  });

  it('rejects joining with a user id that is not a number', async () => {
    const newService = await createService();

    const res = await request(app)
      .post(`/api/queues/${newService.id}/join`)
      .send({ customerName: 'Tester', userId: 'abc' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/notifications', () => {
  it('returns all notifications', async () => {
    createNotification({ userId: ADMIN_ID, type: 'status', message: 'one' });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns notifications for one user', async () => {
    const other = await registerUser('other@example.com');
    createNotification({ userId: ADMIN_ID, type: 'status', message: 'mine' });
    createNotification({ userId: other.id, type: 'status', message: 'not mine' });

    const res = await request(app).get(`/api/notifications?userId=${ADMIN_ID}`);

    expect(res.body.map(note => note.message)).toEqual(['mine']);
  });

  it('returns 400 for an invalid user id', async () => {
    const res = await request(app).get('/api/notifications?userId=abc');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/notifications', () => {
  it('creates a notification for a user', async () => {
    const user = await registerUser('post@example.com');

    const res = await request(app)
      .post('/api/notifications')
      .send({ userId: user.id, message: '  Status changed  ' });

    expect(res.status).toBe(201);
    expect(res.body.notification).toMatchObject({
      userId: user.id,
      type: 'status',
      message: 'Status changed'
    });
  });

  it('creates a notification without a user', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ message: 'General update' });

    expect(res.status).toBe(201);
    expect(res.body.notification.userId).toBeNull();
  });

  it('requires a message', async () => {
    const res = await request(app).post('/api/notifications').send({});

    expect(res.status).toBe(400);
  });

  it('rejects an empty, non text, or too long message', async () => {
    const send = message => request(app).post('/api/notifications').send({ message });

    expect((await send('   ')).status).toBe(400);
    expect((await send(5)).status).toBe(400);
    expect((await send('a'.repeat(201))).status).toBe(400);
  });

  it('rejects an invalid user id', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ userId: 'x', message: 'Hi' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ userId: 999, message: 'Hi' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/notifications/:id/viewed', () => {
  it('marks the notification as viewed', async () => {
    const note = createNotification({ userId: ADMIN_ID, type: 'status', message: 'Unread' });

    const res = await request(app).patch(`/api/notifications/${note.id}/viewed`);

    expect(res.status).toBe(200);
    expect(res.body.notification.status).toBe('viewed');
    expect(getNotifications(ADMIN_ID)[0].status).toBe('viewed');
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).patch('/api/notifications/abc/viewed');

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown notification', async () => {
    const res = await request(app).patch('/api/notifications/999/viewed');

    expect(res.status).toBe(404);
  });
});
