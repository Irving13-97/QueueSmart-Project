import express from 'express';
import { fileURLToPath } from 'url';
import authRouter, { findUserById } from './auth.js';
import notificationsRouter, { notifyJoined, notifyCloseToServed } from './notifications.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/notifications', notificationsRouter);

// Temporary service data stored in memory
let services = [
{
    id: 1,
    name: 'Express Oil Change',
    description: 'A quick oil change service',
    duration: 15,
    priority: 'medium'
},
{
    id: 2,
    name: 'Full Synthetic Service',
    description: 'Full synthetic oil change',
    duration: 30,
    priority: 'medium'
},
{
    id: 3,
    name: 'Tire Rotation & Inspection',
    description: 'Tire rotation and vehicle inspection',
    duration: 20,
    priority: 'low'
}

];

let queues = [
{
    serviceId: 1,
    customers:[]
},
{
    serviceId: 2,
    customers:[]
},
{
    serviceId: 3,
    customers:[]
}
];

let nextCustomerId = 1;

let queueHistory = [];

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'QueueSmart backend is running!' });
});

// Get all services
app.get('/api/services', (req, res) => {
  res.json(services);
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

    const newService = {
        id: services.length
            ? Math.max(...services.map(service => service.id)) + 1
            : 1,
        name: name.trim(),
        description: description.trim(),
        duration: serviceDuration,
        priority
    };

    services.push(newService);

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

    const service = services.find(item => item.id === serviceId);

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

    service.name = name.trim();
    service.description = description.trim();
    service.duration = serviceDuration;
    service.priority = priority;

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

  const serviceIndex = services.findIndex(
    service => service.id === serviceId
  );

  if(serviceIndex === -1){
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

  const deletedService = services[serviceIndex];

  services.splice(serviceIndex, 1);
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

  if(queue.customers.length === 0){
    return res.status(400).json({
      error: "No customers are waiting in this queue",
    });
  }

  const servedCustomer = queue.customers.shift();

  queueHistory.push({
    customerId: servedCustomer.id,
    customerName: servedCustomer.customerName,
    serviceId: serviceId,
    serviceName: service.name,
    status: 'served',
    completedAt: new Date().toISOString()
  });

  queue.customers.forEach((customer, index) =>{
    customer.position = index + 1;
  });

  notifyCloseToServed(queue, service);

  return res.status(200).json({
    message: `${servedCustomer.customerName} has been served`,
    servedCustomer,
    remainingCustomers: queue.customers.length,
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

  const customer = {
    id: nextCustomerId++,
    customerName: customerName.trim(),
    serviceId,
    position: queue.customers.length + 1
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

  const customers = queue.customers.map((customer, index) => ({
    ...customer,
    position: index + 1,
    estimatedWait: (index + 1) * service.duration
  }));

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

  const customerIndex = queue.customers.findIndex(
    customer => customer.id === customerId
  );

  if (customerIndex === -1) {
    return res.status(404).json({
      error: 'Customer not found in this queue.'
    });
  }

  const removedCustomer = queue.customers.splice(customerIndex, 1)[0];

  queueHistory.push({
    customerId: removedCustomer.id,
    customerName: removedCustomer.customerName,
    serviceId: serviceId,
    serviceName: services.find(service => service.id === serviceId).name,
    status: 'left',
    completedAt: new Date().toISOString()
  });

  notifyCloseToServed(queue, services.find(service => service.id === serviceId));

  return res.json({
    message: `${removedCustomer.customerName} has left the queue.`,
    customerId: removedCustomer.id,
    remainingCustomers: queue.customers.length
  });
});



app.get('/api/history', (req, res) => {
  return res.json(queueHistory);
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

  const serviceHistory = queueHistory.filter(
    record => record.serviceId === serviceId
  );

  return res.json(serviceHistory);
});




if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`QueueSmart backend running at http://localhost:${PORT}`);
  });
}

export default app;
