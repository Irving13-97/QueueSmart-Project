import { useState } from "react";
import { Link } from "react-router-dom";
import '../App.css';

export default function ServiceManagement(){
  const [serviceName, setServiceName] = useState('');
  const handleSubmit = (e) =>{e.preventDefault()};

  return(
    <div className="service-management">
      <h1>Service Management</h1>
      <p>Create and Manage Services</p>

      <Link to="/admin-dashboard">Back to Admin Dashboard</Link>

      <h2>Create Service</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Service Name:</label>
          <input 
            type="text" 
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
        </div>

        <div>
          <label>Description:</label>
          <textarea />
        </div>

        <div>
          <label>Expected Duration (minutes):</label>
          <input type="number"/>
        </div>

        <div>
          <label>Priority:</label>
          <select>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button type="submit">Create Service</button>
      </form>
    </div>
  );
}