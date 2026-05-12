import { useState, FormEvent } from 'react';
import { supabase, ADMIN_EMAIL } from '../config/supabase';
import './Login.css';

const INVITE_CODE = (import.meta.env.VITE_INVITE_CODE ?? '').trim();

interface SignupProps {
  onSwitchToLogin: () => void;
}

export function Signup({ onSwitchToLogin }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!INVITE_CODE) {
      setError('Signup is not configured. Please contact the administrator.');
      return;
    }

    if (inviteCode.trim() !== INVITE_CODE) {
      setError('Invalid invite code.');
      return;
    }

    // Staff-only signup. The admin account must be created by an existing
    // admin via the Supabase dashboard (Authentication -> Users).
    if (ADMIN_EMAIL && normalizedEmail === ADMIN_EMAIL) {
      setError(
        'This email is reserved for the administrator. Admin accounts cannot be created from the signup page.'
      );
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is enabled in Supabase, the session will be null
    // until the user clicks the confirmation link in their inbox.
    if (!data.session) {
      setInfo(
        'Account created. Check your inbox for a confirmation email, then return here to sign in.'
      );
      setPassword('');
      setConfirmPassword('');
    }
    // Otherwise the App-level auth listener will swap to the main view.
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎟️ Nick's Stag Tracker</h1>
          <p>Create a staff account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="inviteCode">Invite Code</label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Provided by the administrator"
              autoComplete="off"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-info">{info}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading || !email || !password || !confirmPassword || !inviteCode}
          >
            {loading ? 'Creating account...' : 'Create Staff Account'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="login-link"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
