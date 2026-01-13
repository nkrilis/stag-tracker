import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { TicketForm } from './components/TicketForm';
import { TicketCheck } from './components/TicketCheck';
import './App.css';

function Navigation() {
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
    </nav>
  );
}

function AppContent() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<TicketForm />} />
        <Route path="/check" element={<TicketCheck />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename="/stag-tracker">
      <div className="app">
        <AppContent />
      </div>
    </BrowserRouter>
  );
}

export default App;
