import express from 'express';
import { findUserById } from './auth.js';

export const CLOSE_POSITION = 2;
const MESSAGE_MAX = 200;

let notifications = [];
let nextNotificationId = 1;
let notifiedCloseCustomers = new Set();

export function resetNotifications() {
  notifications = [];
  nextNotificationId = 1;
  notifiedCloseCustomers = new Set();
}

export function createNotification({ userId = null, customerId = null, serviceId = null, type, message }) {
  const notification = {
    id: nextNotificationId++,
    userId,
    customerId,
    serviceId,
    type,
    message,
    createdAt: new Date().toISOString()
  };
  notifications.push(notification);
  return notification;
}

export function getNotifications(userId) {
  const list = userId === undefined
    ? notifications
    : notifications.filter(item => item.userId === userId);
  return [...list].reverse();
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

function parseUserId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const router = express.Router();

router.get('/', (req, res) => {
  if (req.query.userId === undefined) {
    return res.json(getNotifications());
  }

  const userId = parseUserId(req.query.userId);

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
    id = parseUserId(userId);

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

export default router;
