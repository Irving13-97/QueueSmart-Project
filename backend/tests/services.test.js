import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Root & Service Management Endpoints', () => {
  it('GET / Health Check', async () => {
    const res = await request(app)
    .get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('QueueSmart backend is running!');
  });

  it('GET /api/services returns the initial seed services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  describe('POST /api/services', () => {
    it('creates a new service with valid data', async () => {
      const newService = {
        name: 'Brake Fluid Flush',
        description: 'Complete replacement of brake fluid',
        duration: 25,
        priority: 'high'
      };

      const res = await request(app).post('/api/services').send(newService);
      expect(res.status).toBe(201);
      expect(res.body.service).toMatchObject({
        name: 'Brake Fluid Flush',
        duration: 25,
        priority: 'high'
      });
      expect(res.body.service.id).toBeDefined();
    });

    it('rejects payload when required fields are missing', async () => {
      const res = await request(app).post('/api/services').send({
        name: 'Incomplete Service'
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('All fields are required');
    });

    it('rejects invalid service name lengths and blank descriptions', async () => {
      const resLongName = await request(app).post('/api/services').send({
        name: 'A'.repeat(101),
        description: 'Valid description',
        duration: 30,
        priority: 'medium'
      });
      expect(resLongName.status).toBe(400);

      const resBlankDesc = await request(app).post('/api/services').send({
        name: 'Valid Name',
        description: '   ',
        duration: 30,
        priority: 'medium'
      });
      expect(resBlankDesc.status).toBe(400);
    });

    it('rejects non-positive and non-numeric durations', async () => {
      const res = await request(app).post('/api/services').send({
        name: 'Invalid Duration',
        description: 'Test service',
        duration: -10,
        priority: 'low'
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Duration must be a positive number');
    });

    it('rejects unsupported priority levels', async () => {
      const res = await request(app).post('/api/services').send({
        name: 'Invalid Priority',
        description: 'Test service',
        duration: 20,
        priority: 'critical'
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Priority must be low, medium, or high');
    });
  });

  describe('PUT /api/services/:id', () => {
    it('updates an existing service', async () => {
      const res = await request(app).put('/api/services/1').send({
        name: 'Express Oil Change Updated',
        description: 'Faster express service',
        duration: 12,
        priority: 'high'
      });

      expect(res.status).toBe(200);
      expect(res.body.service.name).toBe('Express Oil Change Updated');
      expect(res.body.service.duration).toBe(12);
    });

    it('returns 404 for an unknown service ID', async () => {
      const res = await request(app).put('/api/services/9999').send({
        name: 'Ghost Service',
        description: 'Does not exist',
        duration: 20,
        priority: 'low'
      });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Service not found');
    });

    it('validates fields during update', async () => {
      const res = await request(app).put('/api/services/1').send({
        name: '',
        description: 'Valid',
        duration: 15,
        priority: 'low'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('returns 400 for an invalid ID format', async () => {
      const res = await request(app).delete('/api/services/abc');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid service ID');
    });

    it('returns 404 if the service does not exist', async () => {
      const res = await request(app).delete('/api/services/9999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Service not found');
    });

    it('deletes an idle service with no active queue customers', async () => {
      const created = await request(app).post('/api/services').send({
        name: 'Temporary Service',
        description: 'To be deleted',
        duration: 10,
        priority: 'low'
      });
      const targetId = created.body.service.id;

      const res = await request(app).delete(`/api/services/${targetId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Service deleted successfully');
    });

    it('returns 409 when deleting a service with customers waiting in queue', async () => {
      const created = await request(app).post('/api/services').send({
        name: 'Busy Service',
        description: 'Has active line',
        duration: 15,
        priority: 'medium'
      });
      const serviceId = created.body.service.id;

      await request(app).post(`/api/queues/${serviceId}/join`).send({
        customerName: 'Waiting Customer'
      });

      const res = await request(app).delete(`/api/services/${serviceId}`);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Cannot delete a service while customers are waiting');
    });
  });
});