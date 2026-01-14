import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { TicketForm } from './components/TicketForm';
import { TicketCheck } from './components/TicketCheck';
import { Login } from './components/Login';
import './App.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function Navigation({ onInstallClick, showInstallButton }: { onInstallClick: () => void; showInstallButton: boolean }) {
  const location = useLocation();
  
  return (
    <nav className="nav-tabs">
      <Link 
        to="/" 
        className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
      >
        Add Tickets
      </Link>
      <Link 
        to="/check" 
        className={`nav-tab ${location.pathname === '/check' ? 'active' : ''}`}
      >
        Check Ticket
      </Link>
      {showInstallButton && (
        <button 
          onClick={onInstallClick}
          className="install-button"
          aria-label="Install App"
        >
          📱 Install App
        </button>
      )}
    </nav>
  );
}

function AppContent() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide button if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <>
      <Navigation onInstallClick={handleInstallClick} showInstallButton={showInstallButton} />
      <Routes>
        <Route path="/" element={<TicketForm />} />
        <Route path="/check" element={<TicketCheck />} />
      </Routes>
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const authStatus = localStorage.getItem('stagTrackerAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('stagTrackerAuth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter basename="/stag-tracker">
      <div className="app">
        <AppContent />
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </BrowserRouter>
  );
}

export default App;
