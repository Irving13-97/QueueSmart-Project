import { useNavigate, Link } from 'react-router-dom';
import { addNotification } from '../notifications';
import '../App.css';

// mock services available for selection
const mockServices = [
  { id: 1, name: 'Express Oil Change', estimatedTime: '15 mins' },
  { id: 2, name: 'Full Synthetic Service', estimatedTime: '30 mins' },
  { id: 3, name: 'Tire Rotation & Inspection', estimatedTime: '20 mins' }
];

export default function JoinQueue() {
  const navigate = useNavigate();

  // select a service and join queue
  const handleJoin = (service) => {
    const queueData = {
      serviceName: service.name,
      position: Math.floor(Math.random() * 4) + 2, // Random position between 2 and 5
      waitTime: service.estimatedTime
    };

    // save to localStorage so UserDashboard can read it
    localStorage.setItem('queuesmart_active_queue', JSON.stringify(queueData));
    addNotification('You joined the queue for ' + service.name);

    alert(`Successfully joined queue for ${service.name}!`);
    navigate('/user-dashboard');
  };

  return (
    <div>
      {/* Header */}
      <div>
        <h1>Join a Queue</h1>
        <p>Select an available service</p>
        <Link to="/user-dashboard">Back to Dashboard</Link>
      </div>

      {/* Services List & Wait Times */}
      <div>
        <h2>Available Services &amp; Estimated Wait Times</h2>
        <p>Click "Join Queue" on your preferred service:</p>

        {mockServices.map((service) => (
          <div key={service.id}>
            <h3>{service.name}</h3>
            <p>Est. Wait Time: {service.estimatedTime}</p>
            <button onClick={() => handleJoin(service)}>Join Queue</button>
          </div>
        ))}
      </div>
    </div>
  );
}