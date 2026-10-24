import { useState, useEffect } from 'react';
import { apiRequest, clearCurrentUser } from '../api';
import { Link } from 'react-router-dom';
import '../App.css';


export default function AdminDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        // Get available services
        const serviceData = await apiRequest("/api/services");

        // Get the current queue count for each service
        const servicesWithQueues = await Promise.all(
          serviceData.map(async (service) => {
            const queueData = await apiRequest(
              `/api/queues/${service.id}`
            );

            return {
              ...service,
              queueCount: queueData.customers.length,
            };
          })
        );

        if (active) {
          setServices(servicesWithQueues);
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

    loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshCount]);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Manage services and monitor queues.</p>

      <h2>Services</h2>

      <button
        onClick={() => setRefreshCount((count) => count + 1)}
        disabled={loading}
      >
        Refresh Dashboard
      </button>

      {loading && <p>Loading services...</p>}

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && services.length === 0 && (
        <p>No services available.</p>
      )}

      <div className="services-container">
        {!loading && !error && services.map((service) => (
          <div className="service-card" key={service.id}>
            <h3>{service.name}</h3>
            <p>Queue: {service.queueCount} people</p>
            <p>Duration: {service.duration} minutes</p>
            <p>Priority: {service.priority}</p>
          </div>
        ))}
      </div>

      <Link to="/service-management">
        Service Management
      </Link>

      <br />

      <Link to="/queue-management">
        Queue Management
      </Link>

      <br />

      <Link to="/" onClick={clearCurrentUser}>
        Log Out
      </Link>
    </div>
  );
}
