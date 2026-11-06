import express from 'express';
import db from './database/db.js';
import { findUserById } from './auth.js';

export const CLOSE_POSITION = 2;
const MESSAGE_MAX = 200;

// Customer ids still come from the in-memory queue, so this has the same lifetime as the queue
let notifiedCloseCustomers = new Set();

const selectNotification = `
  SELECT
    notification_id AS id,
    user_id AS userId,
    customer_id AS customerId,
    service_id AS serviceId,
    type,
    message,
    status,
    created_at AS createdAt
  FROM Notification
`;

const insertStatement = db.prepare(`
  INSERT INTO Notification (user_id, customer_id, service_id, type, message, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const findByIdStatement = db.prepare(`${selectNotification} WHERE notification_id = ?`);
const allStatement = db.prepare(`${selectNotification} ORDER BY notification_id DESC`);
const byUserStatement = db.prepare(`${selectNotification} WHERE user_id = ? ORDER BY notification_id DESC`);

const markViewedStatement = db.prepare(`
  UPDATE Notification
  SET status = 'viewed'
  WHERE notification_id = ?
`);

export function resetNotifications() {
  db.prepare('DELETE FROM Notification').run();
  db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'Notification'`).run();
  notifiedCloseCustomers = new Set();
}

export function createNotification({ userId = null, customerId = null, serviceId = null, type, message }) {
  const result = insertStatement.run(
    userId,
    customerId,
    serviceId,
    type,
    message,
    new Date().toISOString()
  );
  return findByIdStatement.get(Number(result.lastInsertRowid));
}

export function getNotifications(userId) {
  return userId === undefined
    ? allStatement.all()
    : byUserStatement.all(userId);
}

export function markNotificationViewed(id) {
  markViewedStatement.run(id);
  return findByIdStatement.get(id);
}

export function notifyJoined(customer, service) {
  return createNotification({
    userId: customer.userId ?? null,
    customerId: customer.id,
    serviceId: service.id,
    type: 'joined',
    message: `You joined the queue for ${service.name}. Your position is #${customer.position}.`
  });
}

export function notifyCloseToServed(queue, service) {
  const created = [];

  queue.customers.forEach((customer, index) => {
    const position = index + 1;

    if (position > CLOSE_POSITION || notifiedCloseCustomers.has(customer.id)) {
      return;
    }

    notifiedCloseCustomers.add(customer.id);
    created.push(createNotification({
      userId: customer.userId ?? null,
      customerId: customer.id,
      serviceId: service.id,
      type: 'almost_ready',
      message: position === 1
        ? `You are next in line for ${service.name}.`
        : `You are almost ready for ${service.name}. Your position is #${position}.`
    }));
  });

  return created;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const router = express.Router();

router.get('/', (req, res) => {
  if (req.query.userId === undefined) {
    return res.json(getNotifications());
  }

  const userId = parseId(req.query.userId);

  if (userId === null) {
    return res.status(400).json({ error: 'User ID must be a positive whole number' });
  }

  return res.json(getNotifications(userId));
});

router.post('/', (req, res) => {
  const { userId, message } = req.body ?? {};

  if (message === undefined) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (typeof message !== 'string' || message.trim().length === 0 || message.trim().length > MESSAGE_MAX) {
    return res.status(400).json({ error: `Message must be between 1 and ${MESSAGE_MAX} characters` });
  }

  let id = null;

  if (userId !== undefined && userId !== null) {
    id = parseId(userId);

    if (id === null) {
      return res.status(400).json({ error: 'User ID must be a positive whole number' });
    }

    if (!findUserById(id)) {
      return res.status(404).json({ error: 'User not found' });
    }
  }

  const notification = createNotification({
    userId: id,
    type: 'status',
    message: message.trim()
  });

  return res.status(201).json({
    message: 'Notification created',
    notification
  });
});

router.patch('/:id/viewed', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Notification ID must be a positive whole number' });
  }

  if (!findByIdStatement.get(id)) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  return res.json({
    message: 'Notification marked as viewed',
    notification: markNotificationViewed(id)
  });
});

export default router;
