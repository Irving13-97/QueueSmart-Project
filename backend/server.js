import express from 'express';
import { fileURLToPath } from 'url';
import authRouter, { findUserById } from './auth.js';
import notificationsRouter, { notifyJoined, notifyCloseToServed } from './notifications.js';
import db from './database/db.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/notifications', notificationsRouter);

let services = db.prepare(`
    SELECT
        service_id AS id,
        service_name AS name,
        description,
        expected_duration AS duration,
        priority_level AS priority
    FROM Service
`).all();

db.prepare(`
    INSERT INTO Queue (service_id, status)
    SELECT s.service_id, 'open'
    FROM Service s
    WHERE NOT EXISTS (
        SELECT 1
        FROM Queue q
        WHERE q.service_id = s.service_id
    )
`).run();



let queues = services.map(service => {
  const customers = db.prepare(`
    SELECT
      qe.entry_id AS id,
      qe.customer_name AS customerName,
      q.service_id AS serviceId,
      qe.position,
      qe.user_id AS userId
    FROM QueueEntry qe
    JOIN Queue q ON qe.queue_id = q.queue_id
    WHERE q.service_id = ?
      AND qe.status = 'waiting'
    ORDER BY qe.position, qe.entry_id
  `).all(service.id).map((customer, index) => {
    const result = {
      id: customer.id,
      customerName: customer.customerName,
      serviceId: customer.serviceId,
      position: index + 1
    };

    if (customer.userId !== null) {
      result.userId = customer.userId;
    }

    return result;
  });

  return {
    serviceId: service.id,
    customers
  };
});



let nextCustomerId = 1;

let queueHistory = [];

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'QueueSmart backend is running!' });
});

// Get all services
app.get('/api/services', (req, res) => {
    const servicesFromDatabase = db.prepare(`
        SELECT
            service_id AS id,
            service_name AS name,
            description,
            expected_duration AS duration,
            priority_level AS priority
        FROM Service
    `).all();
    return res.json(servicesFromDatabase);
});

app.post('/api/services',(req,res) => {
    const{name, description, duration, priority} = req.body;

    if(!name || !description || duration === undefined || !priority){
        return res.status(400).json({
            error: 'All fields are required'
        });
    }

    if(
        typeof name !== 'string' ||
        typeof description !== 'string' ||
        name.trim().length === 0 ||
        name.trim().length > 100 ||
        description.trim().length === 0
    ){
        return res.status(400).json({
            error: 'Name must be 1-100 characters, and description is required'
        });
    }

    const serviceDuration = Number(duration);

    if (!Number.isFinite(serviceDuration) || serviceDuration <= 0){
        return res.status(400).json({
            error: 'Duration must be a positive number'
        });
    }

    if(!['low', 'medium', 'high'].includes(priority)){
        return res.status(400).json({
            error: 'Priority must be low, medium, or high'
        });
    }

    const result = db.prepare(`
        INSERT INTO Service
        (service_name, description, expected_duration, priority_level)
        VALUES (?, ?, ?, ?)
      `).run(
        name.trim(),
        description.trim(),
        serviceDuration,
        priority
      );

      const newService = {
        id: Number(result.lastInsertRowid),
        name: name.trim(),
        description: description.trim(),
        duration: serviceDuration,
        priority
      };

      services.push(newService);

      db.prepare(`
      INSERT INTO Queue (service_id, status)
      VALUES (?, 'open')
      `).run(newService.id);


      queues.push({
          serviceId: newService.id,
          customers: []
      });

    return res.status(201).json({
        message: 'Service created successfully',
        service: newService
    });

});

app.put('/api/services/:id', (req, res) => {
    const serviceId= Number(req.params.id);

    //const service = services.find(item => item.id === serviceId);

    const service = db.prepare(`
      SELECT
          service_id AS id,
          service_name AS name,
          description,
          expected_duration AS duration,
          priority_level AS priority
        FROM Service
        WHERE service_id = ?
    `).get(serviceId);


    if(!service){
        return res.status(404).json({
            error: 'Service not found'
        });
    }

    const {name, description, duration, priority} = req.body;

    if(!name || !description || duration === undefined || !priority){
        return res.status(400).json({
            error: 'All fields are required'
        });
    }

    if(
        typeof name !== 'string' ||
        typeof description !== 'string' ||
        name.trim().length === 0 ||
        name.trim().length > 100 ||
        description.trim().length === 0
    ){
        return res.status(400).json({
            error: 'Name must be 1-100 characters, and description is required'
        });
    }

    const serviceDuration = Number(duration);

    if (!Number.isFinite(serviceDuration) || serviceDuration <= 0){
        return res.status(400).json({
            error: 'Duration must be a positive number'
        });
    }

    if(!['low', 'medium', 'high'].includes(priority)){
        return res.status(400).json({
            error: 'Priority must be low, medium, or high'
        });
    }

    db.prepare(`
        UPDATE Service
        SET service_name = ?,
            description = ?,
            expected_duration = ?,
            priority_level = ?
        WHERE service_id = ?
    `).run(
        name.trim(),
        description.trim(),
        serviceDuration,
        priority,
        serviceId
    );

    service.name = name.trim();
    service.description = description.trim();
    service.duration = serviceDuration;
    service.priority = priority;

    const memoryService = services.find(item => item.id === serviceId);
    if (memoryService) {
        Object.assign(memoryService, service);
    }

    return res.json({
        message: 'Service updated successfully',
        service
    });
});

app.delete('/api/services/:id', (req, res) =>{
  const serviceId = Number(req.params.id);

  if (!Number.isInteger(serviceId) || serviceId <= 0){
    return res.status(400).json({
      error: 'Invalid service ID'
    });
  }

    const deletedService = db.prepare(`
        SELECT
            service_id AS id,
            service_name AS name,
            description,
            expected_duration AS duration,
            priority_level AS priority
        FROM Service
        WHERE service_id = ?
    `).get(serviceId);

    if (!deletedService) {
        return res.status(404).json({
            error: 'Service not found'
        });
    }

  const queue = queues.find(item => item.serviceId === serviceId);

  if(queue && queue.customers.length > 0){
    return res.status(409).json({
      error: 'Cannot delete a service while customers are waiting'
    });
  }

    const existingHistory = db.prepare(`
    SELECT COUNT(*) AS total
    FROM QueueHistory
    WHERE service_id = ?
  `).get(serviceId);

  if (existingHistory.total > 0) {
    return res.status(409).json({
      error: 'Cannot delete a service that has completed history records'
    });
  }
      const deleteServiceTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE Notification
      SET service_id = NULL
      WHERE service_id = ?
    `).run(serviceId);

    db.prepare(`
      DELETE FROM QueueEntry
      WHERE queue_id IN (
        SELECT queue_id
        FROM Queue
        WHERE service_id = ?
      )
    `).run(serviceId);

    db.prepare(`
      DELETE FROM Queue
      WHERE service_id = ?
    `).run(serviceId);

    db.prepare(`
      DELETE FROM Service
      WHERE service_id = ?
    `).run(serviceId);
  });

deleteServiceTransaction();


    services = services.filter(item => item.id !== serviceId);
    queues = queues.filter(item => item.serviceId !== serviceId);


  return res.json({
    message: 'Service deleted successfully',
    service: deletedService
  });

});

app.post("/api/queues/:serviceId/serve-next", (req, res) =>{
  const serviceId = Number(req.params.serviceId);

  if(!Number.isInteger(serviceId) || serviceId <= 0){
    return res.status(400).json({
      error: "Invalid service ID",
    });
  }

  const service = services.find((s) => s.id === serviceId);

  if(!service){
    return res.status(404).json({
      error: "Service not found",
    });
  }

  const queue = queues.find((q) => q.serviceId === serviceId);

  if(!queue){
    return res.status(404).json({
      error: "Queue not found",
    });
  }

  if (!db.prepare(`
    SELECT 1
    FROM QueueEntry qe
    JOIN Queue q ON qe.queue_id = q.queue_id
    WHERE q.service_id = ?
      AND qe.status = 'waiting'
    LIMIT 1
  `).get(serviceId)) {

    return res.status(400).json({
      error: "No customers are waiting in this queue"
    });
  }

  const serveNextTransaction = db.transaction(() => {
    const nextCustomer = db.prepare(`
     SELECT
        qe.entry_id AS id,
        qe.customer_name AS customerName,
        qe.user_id AS userId,
        q.queue_id AS queueId
      FROM QueueEntry qe
      JOIN Queue q ON qe.queue_id = q.queue_id
      WHERE q.service_id = ?
        AND qe.status = 'waiting'
      ORDER BY qe.position, qe.entry_id
      LIMIT 1
    `).get(serviceId);

    if (!nextCustomer) {
      return null;
    }

    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE QueueEntry
      SET status = 'served'
      WHERE entry_id = ?
    `).run(nextCustomer.id);

    db.prepare(`
      INSERT INTO QueueHistory (
        customer_id,
        user_id,
        service_id,
        customer_name,
        status,
        completed_at
      )
      VALUES (?, ?, ?, ?, 'served', ?)
    `).run(
      nextCustomer.id,
      nextCustomer.userId,
      serviceId,
      nextCustomer.customerName,
      completedAt
    );

    const remaining = db.prepare(`
      SELECT qe.entry_id AS id
      FROM QueueEntry qe
      JOIN Queue q ON qe.queue_id = q.queue_id
      WHERE q.service_id = ?
        AND qe.status = 'waiting'
      ORDER BY qe.position, qe.entry_id
    `).all(serviceId);

    const updatePosition = db.prepare(`
      UPDATE QueueEntry
      SET position = ?
      WHERE entry_id = ?
    `);

    remaining.forEach((customer, index) => {
      updatePosition.run(index + 1, customer.id);
    });

    return {
      servedCustomer: {
        id: nextCustomer.id,
        customerName: nextCustomer.customerName,
        serviceId,
        position: 1,
        ...(nextCustomer.userId !== null
          ? { userId: nextCustomer.userId }
          : {})
      },
      remainingCustomers: remaining.length
    };
  });

  const result = serveNextTransaction();

  if (!result) {
    return res.status(400).json({
      error: 'No customers are waiting in this queue'
    });
  }

  const servedCustomer = result.servedCustomer;

  queue.customers = queue.customers.filter(
    customer => customer.id !== servedCustomer.id
  );

  queue.customers.forEach((customer, index) => {
    customer.position = index + 1;
  });

  queueHistory.push({
    customerId: servedCustomer.id,
    customerName: servedCustomer.customerName,
    serviceId,
    serviceName: service.name,
    status: 'served',
    completedAt: new Date().toISOString()
  });


  notifyCloseToServed(queue, service);

  return res.status(200).json({
    message: `${servedCustomer.customerName} has been served`,
    servedCustomer,
    remainingCustomers: result.remainingCustomers,
  });
});


app.post('/api/queues/:serviceId/join', (req, res) => {
  const serviceId = Number(req.params.serviceId);
  const { customerName, userId } = req.body ?? {};

  const service = services.find(item => item.id === serviceId);
  const queue = queues.find(item => item.serviceId === serviceId);

  if (!service || !queue) {
    return res.status(404).json({
      error: 'Service or queue not found.'
    });
  }

  if (
    typeof customerName !== 'string' ||
    customerName.trim().length === 0 ||
    customerName.trim().length > 100
  ) {
    return res.status(400).json({
      error: 'Customer name is required and must be 100 characters or fewer.'
    });
  }

  if (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) {
    return res.status(400).json({
      error: 'User ID must be a positive whole number.'
    });
  }

  if (userId !== undefined && !findUserById(userId)) {
    return res.status(404).json({
      error: 'User not found.'
    });
  }

  const sqliteQueue = db.prepare(`
  SELECT queue_id
  FROM Queue
  WHERE service_id = ?
`).get(serviceId);

if (!sqliteQueue) {
  return res.status(404).json({
    error: 'Queue not found in database.'
  });
}

const position = queue.customers.length + 1;

  const databaseUser = userId === undefined
    ? undefined
    : db.prepare(`
        SELECT user_id
        FROM UserCredentials
        WHERE user_id = ?
      `).get(userId);

  const result = db.prepare(`
    INSERT INTO QueueEntry (
      queue_id,
      user_id,
      customer_name,
      position,
      status
    )
    VALUES (?, ?, ?, ?, 'waiting')
  `).run(
    sqliteQueue.queue_id,
    databaseUser ? userId : null,
    customerName.trim(),
    position
  );

  const customer = {
    id: Number(result.lastInsertRowid),
    customerName: customerName.trim(),
    serviceId,
    position
  };

  if (userId !== undefined) {
    customer.userId = userId;
  }

  queue.customers.push(customer);

  notifyJoined(customer, service);
  notifyCloseToServed(queue, service);

  return res.status(201).json({
    message: 'Successfully joined the queue.',
    customer
  });
});

app.get('/api/queues/:serviceId', (req, res) => {
  const serviceId = Number(req.params.serviceId);

  const service = services.find(item => item.id === serviceId);
  const queue = queues.find(item => item.serviceId === serviceId);

  if (!service || !queue) {
    return res.status(404).json({
      error: 'Service or queue not found.'
    });
  }

  const customers = db.prepare(`
    SELECT
      qe.entry_id AS id,
      qe.customer_name AS customerName,
      q.service_id AS serviceId,
      qe.position,
      qe.user_id AS userId
    FROM QueueEntry qe
    JOIN Queue q ON qe.queue_id = q.queue_id
    WHERE q.service_id = ?
      AND qe.status = 'waiting'
    ORDER BY qe.position, qe.entry_id
  `).all(serviceId).map((customer, index) => {
    const result = {
      id: customer.id,
      customerName: customer.customerName,
      serviceId: customer.serviceId,
      position: index + 1,
      estimatedWait: (index + 1) * service.duration
    };

    if (customer.userId !== null) {
      result.userId = customer.userId;
    }

    return result;
  });


  return res.json({
    serviceName: service.name,
    customers
  });
  });
  app.delete('/api/queues/:serviceId/leave/:customerId', (req, res) => {
  const serviceId = Number(req.params.serviceId);
  const customerId = Number(req.params.customerId);

  const queue = queues.find(item => item.serviceId === serviceId);

  if (!queue) {
    return res.status(404).json({
      error: 'Queue not found.'
    });
  }

  const leaveTransaction = db.transaction(() => {
    const customer = db.prepare(`
      SELECT
        qe.entry_id AS id,
        qe.customer_name AS customerName,
        qe.user_id AS userId
      FROM QueueEntry qe
      JOIN Queue q ON qe.queue_id = q.queue_id
      WHERE q.service_id = ?
        AND qe.entry_id = ?
        AND qe.status = 'waiting'
    `).get(serviceId, customerId);

    if (!customer) {
      return null;
    }

    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE QueueEntry
      SET status = 'canceled'
      WHERE entry_id = ?
    `).run(customer.id);

    db.prepare(`
      INSERT INTO QueueHistory (
        customer_id,
        user_id,
        service_id,
        customer_name,
        status,
        completed_at
      )
      VALUES (?, ?, ?, ?, 'left', ?)
    `).run(
      customer.id,
      customer.userId,
      serviceId,
      customer.customerName,
      completedAt
    );

    const remaining = db.prepare(`
      SELECT qe.entry_id AS id
      FROM QueueEntry qe
      JOIN Queue q ON qe.queue_id = q.queue_id
      WHERE q.service_id = ?
        AND qe.status = 'waiting'
      ORDER BY qe.position, qe.entry_id
    `).all(serviceId);

    const updatePosition = db.prepare(`
      UPDATE QueueEntry
      SET position = ?
      WHERE entry_id = ?
    `);

    remaining.forEach((entry, index) => {
      updatePosition.run(index + 1, entry.id);
    });

    return {
      customer,
      remainingCustomers: remaining.length,
      completedAt
    };
  });

  const result = leaveTransaction();

  if (!result) {
    return res.status(404).json({
      error: 'Customer not found in this queue.'
    });
  }

  queue.customers = queue.customers.filter(
    customer => customer.id !== customerId
  );

  queue.customers.forEach((customer, index) => {
    customer.position = index + 1;
  });

  const service = services.find(item => item.id === serviceId);

  queueHistory.push({
    customerId: result.customer.id,
    customerName: result.customer.customerName,
    serviceId,
    serviceName: service.name,
    status: 'left',
    completedAt: result.completedAt
  });

  notifyCloseToServed(queue, service);

  return res.json({
    message: `${result.customer.customerName} has left the queue.`,
    customerId: result.customer.id,
    remainingCustomers: result.remainingCustomers
  });
});


app.get('/api/history', (req, res) => {
  const history = db.prepare(`
    SELECT
      h.customer_id AS customerId,
      h.customer_name AS customerName,
      h.service_id AS serviceId,
      s.service_name AS serviceName,
      h.status,
      h.completed_at AS completedAt
    FROM QueueHistory h
    LEFT JOIN Service s ON h.service_id = s.service_id
    ORDER BY h.history_id
  `).all();

  return res.json(history);
});


app.get('/api/history/:serviceId', (req, res) => {
  const serviceId = Number(req.params.serviceId);

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({
      error: 'Invalid service ID'
    });
  }

  const service = services.find(item => item.id === serviceId);

  if (!service) {
    return res.status(404).json({
      error: 'Service not found'
    });
  }

  const history = db.prepare(`
    SELECT
      h.customer_id AS customerId,
      h.customer_name AS customerName,
      h.service_id AS serviceId,
      s.service_name AS serviceName,
      h.status,
      h.completed_at AS completedAt
    FROM QueueHistory h
    LEFT JOIN Service s ON h.service_id = s.service_id
    WHERE h.service_id = ?
    ORDER BY h.history_id
  `).all(serviceId);

  return res.json(history);
});





if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`QueueSmart backend running at http://localhost:${PORT}`);
  });
}

export default app;
