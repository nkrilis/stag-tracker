import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { TicketForm } from './components/TicketForm';
import { Dashboard } from './components/Dashboard';
import { PaymentSearch } from './components/PaymentSearch';
import { GuestSearch } from './components/GuestSearch';
import { BulkCheckIn } from './components/BulkCheckIn';
import { BulkNotification } from './components/BulkNotification';
import { TicketHolders } from './components/TicketHolders';
import { EVENT_DAY } from './config/appMode';
import { supabase, ADMIN_EMAIL, SUPABASE_CONFIGURED } from './config/supabase';
import './App.css';

type View = 'dashboard' | 'add' | 'bulk' | 'search' | 'payment' | 'notifications' | 'holders';

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = userEmail !== null;
  const isAdmin =
    !!userEmail && !!ADMIN_EMAIL && userEmail.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.session?.user.email ?? null);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('dashboard');
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  if (authLoading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="app-loading" style={{ padding: 24, color: 'white', textAlign: 'center' }}>
        <h2>Configuration error</h2>
        <p>
          Supabase environment variables are missing.<br />
          Set <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>,
          and <code>VITE_ADMIN_EMAIL</code> as repository secrets and redeploy.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'signup' ? (
      <Signup onSwitchToLogin={() => setAuthView('login')} />
    ) : (
      <Login onSwitchToSignup={() => setAuthView('signup')} />
    );
  }

  return (
    <div className="app">
      {mobileMenuOpen && (
        <div 
          className="menu-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <h1>🎟️ Nick's Ticket Tracker</h1>
          </div>
          <div className="header-actions">
            {!isOnline && <span className="offline-badge">🔴 Offline Mode</span>}
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
        <nav className={`app-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => handleViewChange('dashboard')}
          >
            📊 Dashboard
          </button>
          
          {/* EVENT DAY MODE or ADMIN: Show Express & Search */}
          {(EVENT_DAY || isAdmin) && (
            <>
              <button
                className={currentView === 'bulk' ? 'active' : ''}
                onClick={() => handleViewChange('bulk')}
              >
                ⚡ Express
              </button>
              <button
                className={currentView === 'search' ? 'active' : ''}
                onClick={() => handleViewChange('search')}
              >
                🔍 Search
              </button>
            </>
          )}
          
          {/* PRE-SALE MODE: Show Payment Management */}
          {(!EVENT_DAY || isAdmin) && (
            <button
              className={currentView === 'payment' ? 'active' : ''}
              onClick={() => handleViewChange('payment')}
            >
              💳 Payments
            </button>
          )}
          
          {isAdmin && (
            <button
              className={currentView === 'notifications' ? 'active' : ''}
              onClick={() => handleViewChange('notifications')}
            >
              📱 Notifications
            </button>
          )}

          {isAdmin && (
            <button
              className={currentView === 'holders' ? 'active' : ''}
              onClick={() => handleViewChange('holders')}
            >
              🎫 Holders
            </button>
          )}
          
          <button
            className={currentView === 'add' ? 'active' : ''}
            onClick={() => handleViewChange('add')}
          >
            ➕ Add Tickets
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'bulk' && (EVENT_DAY || isAdmin) && <BulkCheckIn />}
        {currentView === 'search' && (EVENT_DAY || isAdmin) && <GuestSearch />}
        {currentView === 'payment' && (!EVENT_DAY || isAdmin) && <PaymentSearch />}
        {currentView === 'notifications' && isAdmin && <BulkNotification />}
        {currentView === 'holders' && isAdmin && <TicketHolders />}
        {currentView === 'add' && <TicketForm isAdmin={isAdmin} />}
      </main>
    </div>
  );
}

export default App;
