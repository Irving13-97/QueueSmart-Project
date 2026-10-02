import { useState } from 'react'
import { Link } from 'react-router-dom';
import '../App.css';

export default function AdminDashboard() {
  const [oilOpen, SetoilIsOpen] = useState(true);
  const [tireOpen, SettireIsOpen] = useState(true);
  const [syntheticOpen, SetsyntheticIsOpen] = useState(true);
  return(
    <div>
      <h1>Admin Dashboard</h1>
      <p> Manage services and monitor queues.</p>

      <h2>Services</h2>

      <div className='services-container'>
      
      <div className="service-card">
        {/*Mock data*/}
        <h3>Express Oil change</h3>
        <p>Queue: 5 people</p>
        <p>Status: {oilOpen ? 'Open' : 'Closed'}</p>
        <button onClick={() => SetoilIsOpen(!oilOpen)}> {oilOpen ? 'Close': 'Open'}</button>
      </div>

      <div className="service-card">
        {/*Mock data*/}
        <h3>Tire Rotation & Inspection</h3>
        <p>Queue: 3 people</p>
        <p>Status: {tireOpen ? 'Open' : 'Closed'}</p>
        <button onClick={() => SettireIsOpen(!tireOpen)}> {tireOpen ? 'Close': 'Open'}</button>
      </div>

      <div className="service-card">
        {/*Mock data*/}
        <h3>Full Synthetic Service</h3>
        <p>Queue: 2 people</p>
        <p>Status: {syntheticOpen ? 'Open' : 'Closed'}</p>
        <button onClick={() => SetsyntheticIsOpen(!syntheticOpen)}> {syntheticOpen ? 'Close': 'Open'}</button>
      </div>

      <Link to="/service-management">Service Management</Link>
      <br />
      <Link to="/queue-management">Queue Management</Link>
      <br />
      <Link to="/">Log Out</Link>
      </div>
    </div>
  );
}