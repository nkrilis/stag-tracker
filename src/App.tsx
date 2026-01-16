import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { TicketForm } from './components/TicketForm';
import { Dashboard } from './components/Dashboard';
import { PaymentSearch } from './components/PaymentSearch';
import { GuestSearch } from './components/GuestSearch';
import { BulkCheckIn } from './components/BulkCheckIn';
import { EVENT_DAY } from './config/appMode';
import './App.css';

type View = 'dashboard' | 'add' | 'bulk' | 'search' | 'payment';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('stagTrackerAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('stagTrackerAuth');
    setIsAuthenticated(false);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
            <h1>🎟️ Christopher's Stag Tracker</h1>
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
          
          {/* EVENT DAY MODE: Show Express & Search */}
          {EVENT_DAY && (
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
          {!EVENT_DAY && (
            <button
              className={currentView === 'payment' ? 'active' : ''}
              onClick={() => handleViewChange('payment')}
            >
              💳 Payments
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
        {currentView === 'bulk' && EVENT_DAY && <BulkCheckIn />}
        {currentView === 'search' && EVENT_DAY && <GuestSearch />}
        {currentView === 'payment' && !EVENT_DAY && <PaymentSearch />}
        {currentView === 'add' && <TicketForm />}
      </main>
    </div>
  );
}

export default App;
