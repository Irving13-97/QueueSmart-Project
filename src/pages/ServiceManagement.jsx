import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

export default function ServiceManagement() {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("low");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const [services, setServices] = useState([
    {
      id: 1,
      name: "Express Oil Change",
      description: "Quick oil change service",
      duration: 15,
      priority: "medium",
    },
    {
      id: 2,
      name: "Full Synthetic Service",
      description: "Full synthetic oil service",
      duration: 30,
      priority: "high",
    },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newService = {
      id: editingId || Date.now(),
      name: serviceName,
      description: description,
      duration: Number(duration),
      priority: priority,
    };

    if (editingId) {
      setServices(
        services.map((service) =>
          service.id === editingId ? newService : service
        )
      );
      setMessage("Service updated successfully.");
    } else {
      setServices([...services, newService]);
      setMessage("Service created successfully.");
    }

    setServiceName("");
    setDescription("");
    setDuration("");
    setPriority("low");
    setEditingId(null);
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