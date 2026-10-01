import { useState } from 'react';
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

  // Demo only: moves the user one place forward so each status can be seen
  const handleAdvance = () => {
    const updated = { ...queue, position: queue.position - 1 };
    localStorage.setItem('queuesmart_active_queue', JSON.stringify(updated));
    setQueue(updated);
  };

  return (
    <div>
      <h1>Queue Status</h1>
      <Link to="/user-dashboard">Back to Dashboard</Link>

      {queue ? (
        <div>
          <p>Service: {queue.serviceName}</p>
          <p>
            Current Position:{' '}
            {queue.position > 0 ? `#${queue.position}` : 'None (you have been served)'}
          </p>
          <p>Estimated Wait Time: {queue.position > 0 ? queue.waitTime : '0 mins'}</p>
          <p>Status: {getStatus(queue.position)}</p>

          {queue.position > 0 && (
            <button onClick={handleAdvance}>Advance Queue (demo)</button>
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