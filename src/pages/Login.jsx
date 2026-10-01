import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

// mock admin account. As of Assignment 2, this is the only email that 
// will allow one to login to the admin dashboard
const adminEmails = ['admin@queuesmart.com'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // Client-side validation: check for empty fields
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    // Mock role-based routing: only emails on the admin list go to admin
    if (adminEmails.includes(email.toLowerCase())) {
      navigate('/admin-dashboard');
    } else {
      navigate('/user-dashboard');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Login Page</h2>
        <p>Login to your Account</p>

        {error && <p>{error}</p>}

        <div className="input-group">
          <label>Email: </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit">Log In</button>

        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}