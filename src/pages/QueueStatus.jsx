import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Link } from 'react-router-dom';

import '../App.css';

// Work out the status message from the queue position
function getStatus(position) {
  if (position <= 0) return 'Served';
  if (position <= 2) return 'Almost ready';
  return 'Waiting';
}

export default function QueueStatus() {
  // Read the queue saved by JoinQueue (null if the user hasn't joined one)
  const [queue, setQueue] = useState(() => {
    const saved = localStorage.getItem('queuesmart_active_queue');
    return saved ? JSON.parse(saved) : null;
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

useEffect(() => {
  if (!queue?.serviceId || !queue?.customerId) return;

  let active = true;

  async function loadQueueStatus() {
    try {
      const data = await apiRequest(
        `/api/queues/${queue.serviceId}`
      );

      const customer = data.customers.find(
        (person) => person.id === queue.customerId
      );

      if (!active) return;

      if (customer) {
        const updatedQueue = {
          ...queue,
          serviceName: data.serviceName,
          position: customer.position,
          waitTime: `${customer.estimatedWait} mins`,
        };

        setQueue(updatedQueue);

        localStorage.setItem(
          'queuesmart_active_queue',
          JSON.stringify(updatedQueue)
        );
      } else {
        localStorage.removeItem('queuesmart_active_queue');
        setQueue(null);
        setNotice('You are no longer in this queue.');
      }
    } catch (err) {
      if (active) setError(err.message);
    }
  }

  loadQueueStatus();

  return () => {
    active = false;
  };
}, [queue?.serviceId, queue?.customerId]);

  // Demo only: moves the user one place forward so each status can be seen
  const handleLeave = async () => {
    if (!queue) return;
  
    setError('');
    setNotice('');
  
    try {
      const result = await apiRequest(
        `/api/queues/${queue.serviceId}/leave/${queue.customerId}`,
        {
          method: 'DELETE',
        }
      );
  
      localStorage.removeItem('queuesmart_active_queue');
  
      setQueue(null);
      setNotice(result.message);
  
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Queue Status</h1>
      <Link to="/user-dashboard">Back to Dashboard</Link>
      {notice && <p>{notice}</p>}

{error && (
  <p style={{ color: "red" }} role="alert">
    {error}
  </p>
)}

      {queue ? (
        <div>
          <p>Service: {queue.serviceName}</p>
          <p>
            Current Position:{' '}
            {queue.position > 0 ? `#${queue.position}` : 'None (you have been served)'}
          </p>
          <p>Estimated Wait Time: {queue.position > 0 ? queue.waitTime : '0 mins'}</p>
          <p>Status: {getStatus(queue.position)}</p>
          {notice && <p>{notice}</p>}

          {queue.position > 0 && (
  <>
    <button onClick={handleLeave}>Leave Queue</button>
    <button onClick={() => window.location.reload()}>
      Refresh Status
    </button>
  </>
)}
        </div>
      ) : (
        <div>
          <p>You are currently not checked into any queues.</p>
          <Link to="/join-queue">Go to Join Queue</Link>
        </div>
      )}
    </div>
  );
}