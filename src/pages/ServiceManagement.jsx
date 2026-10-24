import { useState, useEffect } from "react";
import { apiRequest } from "../api";
import { Link } from "react-router-dom";
import "../App.css";

export default function ServiceManagement() {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("low");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const [services, setServices] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function loadServices() {
    try {
      const data = await apiRequest("/api/services");
      if (active) setServices(data);
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

const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage("");
  setError("");

  const serviceData = {
    name: serviceName.trim(),
    description: description.trim(),
    duration: Number(duration),
    priority: priority,
  };

  try {
    const isEditing = editingId !== null;

    const result = await apiRequest(
      isEditing
        ? `/api/services/${editingId}`
        : "/api/services",
      {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(serviceData),
      }
    );

    if (isEditing) {
      setServices((previous) =>
        previous.map((service) =>
          service.id === editingId ? result.service : service
        )
      );
    } else {
      setServices((previous) => [
        ...previous,
        result.service,
      ]);
    }

    setMessage(result.message);

    setServiceName("");
    setDescription("");
    setDuration("");
    setPriority("low");
    setEditingId(null);

  } catch (err) {
    setError(err.message);
  }
};

  const handleEdit = (service) => {
    setServiceName(service.name);
    setDescription(service.description);
    setDuration(service.duration);
    setPriority(service.priority);
    setEditingId(service.id);
    setMessage("");
  };

  return (
    <div className="service-management">
      <h1>Service Management</h1>
      <p>Create and manage services.</p>

      <Link to="/admin-dashboard">Back to Admin Dashboard</Link>

      <h2>{editingId ? "Edit Service" : "Create Service"}</h2>

      {message && <p>{message}</p>}

{error && (
  <p style={{ color: "red" }} role="alert">
    {error}
  </p>
)}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Service Name:</label>
          <input
            type="text"
            value={serviceName}
            maxLength={100}
            required
            onChange={(e) => setServiceName(e.target.value)}
          />
        </div>

        <div>
          <label>Description:</label>
          <textarea
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label>Expected Duration (minutes):</label>
          <input
            type="number"
            min="1"
            value={duration}
            required
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <div>
          <label>Priority:</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button type="submit">
          {editingId ? "Update Service" : "Create Service"}
        </button>
      </form>

      <h2>Existing Services</h2>
      {loading && <p>Loading services...</p>}

      {services.map((service) => (
        <div className="service-card" key={service.id}>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <p>Expected Duration: {service.duration} minutes</p>
          <p>Priority: {service.priority}</p>

          <button onClick={() => handleEdit(service)}>Edit</button>
        </div>
      ))}
    </div>
  );
}
