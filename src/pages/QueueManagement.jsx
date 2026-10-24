
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import "../App.css";

export default function QueueManagement() {
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Load available services from the backend
  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        const data = await apiRequest("/api/services");

        if (active) {
          setServices(data);
          if (data.length > 0) {
            setSelected(String(data[0].id));
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  // Load customers whenever a service is selected
  useEffect(() => {
    if (!selected) return;

    let active = true;
    setQueueLoading(true);
    setError("");

    async function loadQueue() {
      try {
        const data = await apiRequest(
          `/api/queues/${selected}`
        );
        if (active) setPeople(data.customers);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setQueueLoading(false);
      }
    }

    loadQueue();

    return () => {
      active = false;
    };
  }, [selected]);

  // Refresh the current queue after changes
  const refreshQueue = async () => {
    const data = await apiRequest(`/api/queues/${selected}`);
    setPeople(data.customers);
  };

  // Serve the next customer
  const handleServeNext = async () => {
    if (people.length === 0) return;

    setBusy(true);
    setError("");

    try {
      const result = await apiRequest(
        `/api/queues/${selected}/serve-next`,
        { method: "POST" }
      );

      setNotice(result.message);
      await refreshQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Remove a customer from the queue
  const handleRemove = async (customerId) => {
    setBusy(true);
    setError("");

    try {
      const result = await apiRequest(
        `/api/queues/${selected}/leave/${customerId}`,
        { method: "DELETE" }
      );

      setNotice(result.message);
      await refreshQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const selectedService = services.find(
    (service) => String(service.id) === selected
  );

  return (
    <div className="queue-management">
      <h1>Queue Management</h1>
      <p>Manage customers waiting in the queue.</p>

      <Link to="/admin-dashboard">
        Back to Admin Dashboard
      </Link>

      <div className="queue-select">
        <label>Service</label>
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setNotice("");
          }}
          disabled={loading || busy}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <h2>{selectedService?.name || "Select a service"}</h2>

      {notice && <p>{notice}</p>}
      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleServeNext}
        disabled={busy || queueLoading || people.length === 0}
      >
        Serve Next
      </button>

      <button
        onClick={async () => {
          setError("");
          try {
            await refreshQueue();
          } catch (err) {
            setError(err.message);
          }
        }}
        disabled={!selected || busy}
      >
        Refresh Queue
      </button>

      {loading || queueLoading ? (
        <p>Loading queue...</p>
      ) : !selected ? (
        <p>No services available.</p>
      ) : people.length === 0 ? (
        <p>No one is waiting.</p>
      ) : (
        <div>
          <p>{people.length} people waiting</p>

          {people.map((person) => (
            <div key={person.id} className="service-card">
              <p>Position: {person.position}</p>
              <h3>{person.customerName}</h3>
              <p>
                Estimated Wait: {person.estimatedWait} minutes
              </p>

              <button
                onClick={() => handleRemove(person.id)}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
