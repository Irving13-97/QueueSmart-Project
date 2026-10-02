import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    // Client-side validation
    if (!name || !email || !password) {
      setError('All fields are required.');
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

    // Mock account: every new account is a regular user.
    // Admin access would be granted separately (not at sign-up).
    const newAccount = { name, email, role: 'user' };
    console.log('Mock account created:', newAccount);

    alert('Account created successfully!');
    navigate('/user-dashboard');
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

        <button type="submit">Create Account</button>

        <p>
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </form>
    </div>
  );
}