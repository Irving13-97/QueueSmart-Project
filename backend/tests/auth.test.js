import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { resetUsers, validateRegistration, validateLogin, findUserById } from '../auth.js';

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
