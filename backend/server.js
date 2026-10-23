import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

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


app.post('/api/queues/:serviceId/join', (req, res) => {
  const serviceId = Number(req.params.serviceId);
  const { customerName } = req.body;

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

  const customer = {
    id: nextCustomerId++,
    customerName: customerName.trim(),
    serviceId,
    position: queue.customers.length + 1
  };

  queue.customers.push(customer);

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

  return res.json({
    message: `${removedCustomer.customerName} has left the queue.`,
    customerId: removedCustomer.id,
    remainingCustomers: queue.customers.length
  });
});


app.listen(PORT, () => {
  console.log(`QueueSmart backend running at http://localhost:${PORT}`);
});
