import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import '../App.css';

export default function History() {
  const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function loadHistory() {
    try {
      const data = await apiRequest("/api/history");

      if (active) {
        setHistory(data);
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

  loadHistory();

  return () => {
    active = false;
  };
}, []);
  return (
    <div>
      <h1>Queue History</h1>
      <Link to="/user-dashboard">Back to Dashboard</Link>

      
{loading ? (
  <p>Loading history...</p>
) : error ? (
  <p style={{ color: "red" }} role="alert">
    {error}
  </p>
) : history.length === 0 ? (
  <p>No queue history available yet.</p>
) : (
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Customer</th>
        <th>Service</th>
        <th>Outcome</th>
      </tr>
    </thead>
    <tbody>
      {history.map((item, index) => (
        <tr key={`${item.customerId}-${item.completedAt}-${index}`}>
          <td>{new Date(item.completedAt).toLocaleString()}</td>
          <td>{item.customerName}</td>
          <td>{item.serviceName}</td>
          <td>
            {item.status === "served"
              ? "Served"
              : item.status === "left"
              ? "Left Queue"
              : item.status}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
    </div>
  );
}
