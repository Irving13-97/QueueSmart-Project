import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest, setCurrentUser } from '../api';
import '../App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }

    if (name.trim().length > 100) {
      setError('Name must be 100 characters or fewer.');
      return;
    }

    if (!email.includes('@')){
      setError('Please enter a valid email.');
      return;
    }


    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { user } = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setCurrentUser(user);
      alert('Account created successfully!');
      navigate('/user-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleRegister}>
        <h2>Create Account</h2>

        {error && <p>{error}</p>}

        <div className="input-group">
          <label>Name: </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Email: </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>

        <div className="input-group">
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p>
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </form>
    </div>
  );
}