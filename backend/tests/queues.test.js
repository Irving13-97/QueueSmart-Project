import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

async function createQueueService(duration = 20) {
  const res = await request(app).post('/api/services').send({
    name: 'Queue Test Service',
    description: 'Service specifically for queue unit testing',
    duration,
    priority: 'medium'
  });
  return res.body.service;
}

describe('Queue Lifecycle & Wait-Time Logic', () => {
  it('rejects joining a non-existent service queue', async () => {
    const res = await request(app)
      .post('/api/queues/9999/join')
      .send({ customerName: 'Sam' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Service or queue not found.');
  });

  it('rejects joining with missing or invalid customer name', async () => {
    const service = await createQueueService();

    const emptyRes = await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: '   ' });
    expect(emptyRes.status).toBe(400);

    const longRes = await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'A'.repeat(101) });
    expect(longRes.status).toBe(400);
  });

  it('calculates dynamic wait time accurately (Position x Duration)', async () => {
    const service = await createQueueService(15);

    await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'Customer One' });
    await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'Customer Two' });

    const queueRes = await request(app).get(`/api/queues/${service.id}`);
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.customers).toHaveLength(2);

    expect(queueRes.body.customers[0].position).toBe(1);
    expect(queueRes.body.customers[0].estimatedWait).toBe(15); // 1 * 15

    expect(queueRes.body.customers[1].position).toBe(2);
    expect(queueRes.body.customers[1].estimatedWait).toBe(30); // 2 * 15
  });

  it('serves next customer in FIFO order, updates positions, and writes to history', async () => {
    const service = await createQueueService(25);

    const first = await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'First Person' });
    const second = await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'Second Person' });

    const serveRes = await request(app).post(`/api/queues/${service.id}/serve-next`);
    expect(serveRes.status).toBe(200);
    expect(serveRes.body.servedCustomer.id).toBe(first.body.customer.id);
    expect(serveRes.body.remainingCustomers).toBe(1);

    const queueCheck = await request(app).get(`/api/queues/${service.id}`);
    expect(queueCheck.body.customers[0].id).toBe(second.body.customer.id);
    expect(queueCheck.body.customers[0].position).toBe(1);

    const historyRes = await request(app).get(`/api/history/${service.id}`);
    expect(historyRes.status).toBe(200);
    const entry = historyRes.body.find(h => h.customerId === first.body.customer.id);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('served');
  });

  it('handles leaving the queue and logs status as left in history', async () => {
    const service = await createQueueService(10);

    const customer = await request(app)
      .post(`/api/queues/${service.id}/join`)
      .send({ customerName: 'Leaving Customer' });
    const custId = customer.body.customer.id;

    const leaveRes = await request(app).delete(`/api/queues/${service.id}/leave/${custId}`);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.remainingCustomers).toBe(0);

    const historyRes = await request(app).get('/api/history');
    const entry = historyRes.body.find(h => h.customerId === custId);
    expect(entry.status).toBe('left');
  });

  it('returns 400 when serve-next is called on an empty queue', async () => {
    const service = await createQueueService();
    const res = await request(app).post(`/api/queues/${service.id}/serve-next`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No customers are waiting in this queue');
  });

  it('validates IDs on history lookups', async () => {
    const badIdRes = await request(app).get('/api/history/invalid');
    expect(badIdRes.status).toBe(400);

    const missingRes = await request(app).get('/api/history/9999');
    expect(missingRes.status).toBe(404);
  });
});