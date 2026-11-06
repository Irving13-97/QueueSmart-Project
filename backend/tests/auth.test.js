import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import db from '../database/db.js';
import {
  resetUsers,
  validateRegistration,
  validateLogin,
  validateProfile,
  findUserById
} from '../auth.js';

const validUser = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'secret123'
};

beforeEach(() => {
  resetUsers();
});

describe('validateRegistration', () => {
  it('accepts valid input', () => {
    expect(validateRegistration(validUser)).toBeNull();
  });

  it('requires every field', () => {
    expect(validateRegistration({ email: 'a@b.com', password: 'secret123' })).toMatch(/required/);
    expect(validateRegistration({ name: 'A', password: 'secret123' })).toMatch(/required/);
    expect(validateRegistration({ name: 'A', email: 'a@b.com' })).toMatch(/required/);
  });

  it('rejects fields that are not text', () => {
    expect(validateRegistration({ ...validUser, name: 42 })).toMatch(/text/);
    expect(validateRegistration({ ...validUser, password: 123456 })).toMatch(/text/);
  });

  it('rejects an empty or too long name', () => {
    expect(validateRegistration({ ...validUser, name: '   ' })).toMatch(/Name/);
    expect(validateRegistration({ ...validUser, name: 'a'.repeat(101) })).toMatch(/Name/);
  });

  it('rejects a badly formatted email', () => {
    expect(validateRegistration({ ...validUser, email: 'not an email' })).toMatch(/Email/);
    expect(validateRegistration({ ...validUser, email: 'a@b' })).toMatch(/Email/);
  });

  it('rejects an email over 254 characters', () => {
    const email = `${'a'.repeat(250)}@b.com`;
    expect(validateRegistration({ ...validUser, email })).toMatch(/Email/);
  });

  it('rejects a short or too long password', () => {
    expect(validateRegistration({ ...validUser, password: '123' })).toMatch(/Password/);
    expect(validateRegistration({ ...validUser, password: 'a'.repeat(101) })).toMatch(/Password/);
  });
});

describe('validateLogin', () => {
  it('accepts valid input', () => {
    expect(validateLogin({ email: 'a@b.com', password: 'x' })).toBeNull();
  });

  it('requires email and password', () => {
    expect(validateLogin({ email: 'a@b.com' })).toMatch(/required/);
    expect(validateLogin({ email: '  ', password: 'x' })).toMatch(/required/);
  });

  it('rejects fields that are not text', () => {
    expect(validateLogin({ email: 1, password: 'x' })).toMatch(/text/);
  });

  it('rejects input that is too long', () => {
    expect(validateLogin({ email: 'a@b.com', password: 'a'.repeat(101) })).toMatch(/too long/);
  });
});

describe('POST /api/auth/register', () => {
  it('creates a user account', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'user'
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(findUserById(res.body.user.id)).toBeDefined();
  });

  it('trims the name and stores the email in lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, name: '  Jane  ', email: 'JANE@Example.com' });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Jane');
    expect(res.body.user.email).toBe('jane@example.com');
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email/);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await request(app).post('/api/auth/register');

    expect(res.status).toBe(400);
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'JANE@example.com' });

    expect(res.status).toBe(409);
  });

  it('never lets someone register as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, role: 'admin' });

    expect(res.body.user.role).toBe('user');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in the seeded admin with the admin role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@queuesmart.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('logs in a registered user with the user role', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ' Jane@Example.com ', password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 for a wrong password', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('user persistence', () => {
  it('stores credentials and profile in separate tables', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    const id = res.body.user.id;

    const credentials = db.prepare('SELECT * FROM UserCredentials WHERE user_id = ?').get(id);
    const profile = db.prepare('SELECT * FROM UserProfile WHERE user_id = ?').get(id);

    expect(credentials).toMatchObject({ email: 'jane@example.com', role: 'User' });
    expect(profile.full_name).toBe('Jane Doe');
  });

  it('never stores the plain text password', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    const { password_hash } = db
      .prepare('SELECT password_hash FROM UserCredentials WHERE user_id = ?')
      .get(res.body.user.id);

    expect(password_hash).not.toContain(validUser.password);
    expect(password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('stores the seeded admin with the Administrator role', () => {
    const admin = db
      .prepare('SELECT role FROM UserCredentials WHERE email = ?')
      .get('admin@queuesmart.com');

    expect(admin.role).toBe('Administrator');
  });

  it('enforces a unique email at the database level', () => {
    expect(() => db
      .prepare("INSERT INTO UserCredentials (email, password_hash) VALUES ('admin@queuesmart.com', 'x')")
      .run()
    ).toThrow(/UNIQUE/);
  });

  it('rejects a role outside the schema', () => {
    expect(() => db
      .prepare("INSERT INTO UserCredentials (email, password_hash, role) VALUES ('x@y.com', 'x', 'Owner')")
      .run()
    ).toThrow(/CHECK/);
  });

  it('deletes the profile when the credentials are deleted', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    const id = res.body.user.id;

    db.prepare('DELETE FROM UserCredentials WHERE user_id = ?').run(id);

    expect(db.prepare('SELECT * FROM UserProfile WHERE user_id = ?').get(id)).toBeUndefined();
    expect(findUserById(id)).toBeUndefined();
  });
});

describe('validateProfile', () => {
  it('accepts a name with optional fields', () => {
    expect(validateProfile({ name: 'Jane' })).toBeNull();
    expect(validateProfile({ name: 'Jane', contactInfo: '555-1234', preferences: null })).toBeNull();
  });

  it('requires a valid name', () => {
    expect(validateProfile({})).toMatch(/required/);
    expect(validateProfile({ name: '  ' })).toMatch(/Name/);
    expect(validateProfile({ name: 5 })).toMatch(/Name/);
  });

  it('rejects contact info or preferences that are too long or not text', () => {
    expect(validateProfile({ name: 'Jane', contactInfo: 'a'.repeat(101) })).toMatch(/Contact/);
    expect(validateProfile({ name: 'Jane', contactInfo: 5 })).toMatch(/Contact/);
    expect(validateProfile({ name: 'Jane', preferences: 'a'.repeat(501) })).toMatch(/Preferences/);
  });
});

describe('GET /api/auth/profile/:userId', () => {
  it('returns the stored profile', async () => {
    const created = await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app).get(`/api/auth/profile/${created.body.user.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: created.body.user.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'user',
      contactInfo: null,
      preferences: null
    });
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/auth/profile/abc');

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app).get('/api/auth/profile/999');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/auth/profile/:userId', () => {
  it('updates and persists the profile', async () => {
    const created = await request(app).post('/api/auth/register').send(validUser);
    const id = created.body.user.id;

    const res = await request(app)
      .put(`/api/auth/profile/${id}`)
      .send({ name: ' Jane Smith ', contactInfo: ' 555-1234 ', preferences: 'Text me' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      name: 'Jane Smith',
      contactInfo: '555-1234',
      preferences: 'Text me'
    });

    const again = await request(app).get(`/api/auth/profile/${id}`);
    expect(again.body.name).toBe('Jane Smith');
  });

  it('clears optional fields that are blank', async () => {
    const created = await request(app).post('/api/auth/register').send(validUser);
    const id = created.body.user.id;

    await request(app).put(`/api/auth/profile/${id}`).send({ name: 'Jane', contactInfo: '555' });
    const res = await request(app).put(`/api/auth/profile/${id}`).send({ name: 'Jane', contactInfo: '  ' });

    expect(res.body.profile.contactInfo).toBeNull();
  });

  it('returns 400 for invalid input', async () => {
    const created = await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app)
      .put(`/api/auth/profile/${created.body.user.id}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await request(app).put('/api/auth/profile/1');

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).put('/api/auth/profile/0').send({ name: 'Jane' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app).put('/api/auth/profile/999').send({ name: 'Jane' });

    expect(res.status).toBe(404);
  });
});
