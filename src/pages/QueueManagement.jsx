import { useState } from "react";
import { Link } from "react-router-dom";
import '../App.css';

const services = [
  { id: "oil", name: "Express Oil change" },
  { id: "tire", name: "Tire Rotation & Inspection" },
  { id: "synthetic", name: "Full Synthetic Service" },
];

const initialQueues = {
  oil: [
    { id: 1, name: "Jordan Lee" },
    { id: 2, name: "Alex Rivera" },
    { id: 3, name: "Sam Patel" },
    { id: 4, name: "Taylor Brooks" },
    { id: 5, name: "Casey Nguyen" },
  ],
  tire: [
    { id: 6, name: "Morgan Diaz" },
    { id: 7, name: "Riley Chen" },
    { id: 8, name: "Jamie Ortiz" },
  ],
  synthetic: [
    { id: 9, name: "Avery Shah" },
    { id: 10, name: "Quinn Brooks" },
  ],
};

export default function QueueManagement(){
  const [queues, setQueues] = useState(initialQueues);
  const [selected, setSelected] = useState("oil");
  const [notice, setNotice] = useState("");

  const people = queues[selected];
  const serviceName = services.find((service) => service.id === selected).name;

  const updateSelected = (nextPeople) => {
    setQueues({ ...queues, [selected]: nextPeople });
  };

  const handleServeNext = () => {
    if (people.length === 0) {
      return;
    }
    const served = people[0];
    updateSelected(people.slice(1));
    setNotice(served.name + " was served");
  };

  const handleRemove = (id) => {
    const person = people.find((entry) => entry.id === id);
    updateSelected(people.filter((entry) => entry.id !== id));
    setNotice(person.name + " was removed");
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= people.length) {
      return;
    }
    const next = [...people];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    updateSelected(next);
    setNotice("");
  };

  return(
    <div className="queue-management">
      <h1>Queue Management</h1>
      <p>Manage customers waiting in the queue</p>

      <Link to="/admin-dashboard">Back to Admin Dashboard</Link>

      <div className="queue-select">
        <label>Service</label>
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setNotice("");
          }}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <h2>{serviceName}</h2>
      {notice && <p>{notice}</p>}

      <button onClick={handleServeNext} disabled={people.length === 0}>
        Serve Next
      </button>

      {people.length === 0 ? (
        <p>No one is waiting</p>
      ) : (
        <div>
          <p>
            {people.length === 1
              ? "1 person waiting"
              : people.length + " people waiting"}
          </p>
          {people.map((person, index) => (
            <div key={person.id} className="service-card">
              <p>Position {index + 1}</p>
              <h3>{person.name}</h3>
              <button
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
              >
                Move Up
              </button>
              <button
                onClick={() => handleMove(index, 1)}
                disabled={index === people.length - 1}
              >
                Move Down
              </button>
              <button onClick={() => handleRemove(person.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
