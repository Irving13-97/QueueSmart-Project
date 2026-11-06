import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import db from './database/db.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 100;
const CONTACT_MAX = 100;
const PREFERENCES_MAX = 500;

const ADMIN_EMAIL = 'admin@queuesmart.com';

// The database uses the role names from the schema, the API keeps the short names the frontend expects
const ROLE_TO_DB = { user: 'User', admin: 'Administrator' };
const ROLE_FROM_DB = { User: 'user', Administrator: 'admin' };

const selectUser = `
  SELECT
    c.user_id AS id,
    p.full_name AS name,
    c.email,
    c.role,
    c.password_hash AS passwordHash,
    p.contact_info AS contactInfo,
    p.preferences
  FROM UserCredentials c
  JOIN UserProfile p ON p.user_id = c.user_id
`;

const findByIdStatement = db.prepare(`${selectUser} WHERE c.user_id = ?`);
const findByEmailStatement = db.prepare(`${selectUser} WHERE c.email = ?`);

const insertCredentials = db.prepare(`
  INSERT INTO UserCredentials (email, password_hash, role)
  VALUES (?, ?, ?)
`);

const insertProfile = db.prepare(`
  INSERT INTO UserProfile (user_id, full_name)
  VALUES (?, ?)
`);

const updateProfileStatement = db.prepare(`
  UPDATE UserProfile
  SET full_name = ?, contact_info = ?, preferences = ?
  WHERE user_id = ?
`);

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

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: ROLE_FROM_DB[row.role] };
}

function profileOf(row) {
  return {
    ...publicUser(row),
    contactInfo: row.contactInfo,
    preferences: row.preferences
  };
}

const addUser = db.transaction(({ name, email, password, role }) => {
  const result = insertCredentials.run(email.toLowerCase(), hashPassword(password), ROLE_TO_DB[role]);
  const id = Number(result.lastInsertRowid);
  insertProfile.run(id, name);
  return findByIdStatement.get(id);
});

function ensureAdmin() {
  if (!findByEmailStatement.get(ADMIN_EMAIL)) {
    addUser({
      name: 'Administrator',
      email: ADMIN_EMAIL,
      password: 'admin123',
      role: 'admin'
    });
  }
}

ensureAdmin();

export const resetUsers = db.transaction(() => {
  if (process.env.NODE_ENV === 'test') {
    db.prepare('DELETE FROM QueueEntry').run();
  }

  db.prepare('DELETE FROM UserCredentials').run();
  db.prepare(`
    DELETE FROM sqlite_sequence
    WHERE name IN ('UserCredentials', 'UserProfile')
  `).run();
  ensureAdmin();
});

export function findUserById(id) {
  const row = findByIdStatement.get(id);
  return row ? publicUser(row) : undefined;
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

function isOptionalText(value, max) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim().length <= max);
}

export function validateProfile({ name, contactInfo, preferences }) {
  if (name === undefined) {
    return 'Name is required';
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > NAME_MAX) {
    return `Name must be between 1 and ${NAME_MAX} characters`;
  }
  if (!isOptionalText(contactInfo, CONTACT_MAX)) {
    return `Contact info must be text of ${CONTACT_MAX} characters or fewer`;
  }
  if (!isOptionalText(preferences, PREFERENCES_MAX)) {
    return `Preferences must be text of ${PREFERENCES_MAX} characters or fewer`;
  }
  return null;
}

function optionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function parseUserId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const router = express.Router();

router.post('/register', (req, res) => {
  const body = req.body ?? {};
  const error = validateRegistration(body);

  if (error) {
    return res.status(400).json({ error });
  }

  const email = body.email.trim().toLowerCase();

  if (findByEmailStatement.get(email)) {
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

  const user = findByEmailStatement.get(body.email.trim().toLowerCase());

  if (!user || !passwordMatches(body.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({
    message: 'Login successful',
    user: publicUser(user)
  });
});

router.get('/profile/:userId', (req, res) => {
  const id = parseUserId(req.params.userId);

  if (id === null) {
    return res.status(400).json({ error: 'User ID must be a positive whole number' });
  }

  const user = findByIdStatement.get(id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(profileOf(user));
});

router.put('/profile/:userId', (req, res) => {
  const id = parseUserId(req.params.userId);

  if (id === null) {
    return res.status(400).json({ error: 'User ID must be a positive whole number' });
  }

  if (!findByIdStatement.get(id)) {
    return res.status(404).json({ error: 'User not found' });
  }

  const body = req.body ?? {};
  const error = validateProfile(body);

  if (error) {
    return res.status(400).json({ error });
  }

  updateProfileStatement.run(
    body.name.trim(),
    optionalText(body.contactInfo),
    optionalText(body.preferences),
    id
  );

  return res.json({
    message: 'Profile updated successfully',
    profile: profileOf(findByIdStatement.get(id))
  });
});

export default router;
