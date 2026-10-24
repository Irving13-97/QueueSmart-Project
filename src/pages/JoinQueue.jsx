import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, getCurrentUser } from '../api';
import '../App.css';



export default function JoinQueue() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function loadServices() {
    try {
      const data = await apiRequest("/api/services");

      if (active) {
        setServices(data);
      }
    } catch (err) {
      if (active) {
        setError(err.message);
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  loadServices();

  return () => {
    active = false;
  };
}, []);

  // select a service and join queue
  const handleJoin = async (service) => {
    setError("");
  
    const currentUser = getCurrentUser();
  
    if (!currentUser) {
      setError("Please log in before joining a queue.");
      return;
    }
  
    try {
      const result = await apiRequest(
        `/api/queues/${service.id}/join`,
        {
          method: "POST",
          body: JSON.stringify({
            customerName:
              currentUser.name ||
              currentUser.fullName ||
              currentUser.email,
            ...(Number.isInteger(currentUser.id)
              ? { userId: currentUser.id }
              : {}),
          }),
        }
      );
  
      const queueData = {
        serviceId: service.id,
        customerId: result.customer.id,
        serviceName: service.name,
        position: result.customer.position,
        waitTime: `${result.customer.position * service.duration} mins`,
      };
  
      localStorage.setItem(
        "queuesmart_active_queue",
        JSON.stringify(queueData)
      );
  
      alert(`Successfully joined queue for ${service.name}!`);
  
      navigate("/user-dashboard");
  
    } catch (err) {
      setError(err.message);
    }
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

        {services.map((service) => (
          <div key={service.id}>
            <h3>{service.name}</h3>
            <p>Expected Service Duration: {service.duration} mins</p>
            <button onClick={() => handleJoin(service)}>Join Queue</button>
          </div>
        ))}
      </div>
    </div>
  );
}