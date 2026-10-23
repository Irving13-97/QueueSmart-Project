import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, setCurrentUser } from '../api';
import '../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Client-side validation: check for empty fields
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!email.includes('@')){
      setError('Please enter a valid email.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { user } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCurrentUser(user);
      navigate(user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            type="email"
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

        <button type="submit" disabled={loading}>
          {loading ? 'Logging In...' : 'Log In'}
        </button>

        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
