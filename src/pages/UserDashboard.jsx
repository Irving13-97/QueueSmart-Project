import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getNotifications } from '../notifications';
import '../App.css';

export default function UserDashboard() {
  const [notifications] = useState(() => getNotifications());
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div>
      <div>
        <h1>Customer Dashboard</h1>
        <p>Welcome back to UH Express Software Engineers! Check your status, history, or join a new queue below.</p>
        <Link to="/queue-status">Queue Status</Link>{' '}
        <Link to="/history">History</Link>{' '}
        <button onClick={handleLogout}>Log Out</button>
      </div>
  
      <div>
        <h2>Notifications</h2>
        {notifications.length === 0 ? (
          <p>You have no notifications</p>
        ) : (
          notifications.slice(0, 3).map((note) => (
            <div key={note.id} className="service-card">
              <p>{note.message}</p>
            </div>
          ))
        )}
      </div>

      <div>
        <h2>Active Services Summary</h2>
        <p>
          UH Express Software Engineers currently offers express oil
          packages, and complete multi-point inspections.
        </p>
        <Link to="/join-queue">View All Available Services →</Link>
      </div>
    </div>
  );
}