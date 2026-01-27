import { useState, FormEvent } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (isAdmin: boolean) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Get passwords from environment variables
    const regularPassword = import.meta.env.VITE_LOGIN_PASSWORD;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (password === adminPassword) {
      // Admin access - can access everything including bulk notifications
      localStorage.setItem('stagTrackerAuth', 'admin');
      onLogin(true);
    } else if (password === regularPassword) {
      // Regular access - cannot access bulk notifications
      localStorage.setItem('stagTrackerAuth', 'regular');
      onLogin(false);
    } else {
      setError('Incorrect password');
      setPassword('');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎟️ Christopher's Stag Tracker</h1>
          <p>Event Ticket Management</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading || !password}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
