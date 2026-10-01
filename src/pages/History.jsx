import { Link } from 'react-router-dom';
import '../App.css';

// Mock past queues
const mockHistory = [
  { id: 1, date: '2026-09-28', service: 'Express Oil Change', outcome: 'Served' },
  { id: 2, date: '2026-09-15', service: 'Full Synthetic Service', outcome: 'Left queue' },
  { id: 3, date: '2026-09-02', service: 'Tire Rotation & Inspection', outcome: 'Served' }
];

export default function History() {
  return (
    <div>
      <h1>Queue History</h1>
      <Link to="/user-dashboard">Back to Dashboard</Link>

      {mockHistory.length === 0 ? (
        <p>You have not joined any queues yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.service}</td>
                <td>{item.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}