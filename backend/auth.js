import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 100;

let users = [];
let nextUserId = 1;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = scryptSync(password, salt, 64);
  return timingSafeEqual(attempt, Buffer.from(hash, 'hex'));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function addUser({ name, email, password, role }) {
  const user = {
    id: nextUserId++,
    name,
    email: email.toLowerCase(),
    role,
    passwordHash: hashPassword(password)
  };
  users.push(user);
  return user;
}

export function resetUsers() {
  users = [];
  nextUserId = 1;
  addUser({
    name: 'Administrator',
    email: 'admin@queuesmart.com',
    password: 'admin123',
    role: 'admin'
  });
}

resetUsers();

export function findUserById(id) {
  return users.find(user => user.id === id);
}

export function validateRegistration({ name, email, password }) {
  if (name === undefined || email === undefined || password === undefined) {
    return 'Name, email, and password are required';
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return 'Name, email, and password must be text';
  }
  if (name.trim().length === 0 || name.trim().length > NAME_MAX) {
    return `Name must be between 1 and ${NAME_MAX} characters`;
  }
  if (email.trim().length > EMAIL_MAX || !EMAIL_PATTERN.test(email.trim())) {
    return 'Email must be a valid email address';
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`;
  }
  return null;
}

export function validateLogin({ email, password }) {
  if (email === undefined || password === undefined) {
    return 'Email and password are required';
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Email and password must be text';
  }
  if (email.trim().length === 0 || password.length === 0) {
    return 'Email and password are required';
  }
  if (email.trim().length > EMAIL_MAX || password.length > PASSWORD_MAX) {
    return 'Email or password is too long';
  }
  return null;
}

const router = express.Router();

router.post('/register', (req, res) => {
  const body = req.body ?? {};
  const error = validateRegistration(body);

  if (error) {
    return res.status(400).json({ error });
  }

  const email = body.email.trim().toLowerCase();

  if (users.some(user => user.email === email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = addUser({
    name: body.name.trim(),
    email,
    password: body.password,
    role: 'user'
  });

  return res.status(201).json({
    message: 'Account created successfully',
    user: publicUser(user)
  });
});

router.post('/login', (req, res) => {
  const body = req.body ?? {};
  const error = validateLogin(body);

  if (error) {
    return res.status(400).json({ error });
  }

  const email = body.email.trim().toLowerCase();
  const user = users.find(item => item.email === email);

  if (!user || !passwordMatches(body.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({
    message: 'Login successful',
    user: publicUser(user)
  });
});

export default router;
