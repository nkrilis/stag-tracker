import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import './Dashboard.css';

interface DashboardStats {
  total: number;
  checkedIn: number;
  paid: number;
  remaining: number;
  checkInRate: number;
  revenue: number;
  recentCheckIns: Array<{
    ticketNumber: string;
    name: string;
    phoneNumber: string;
    checkedIn: string;
  }>;
}

const TICKET_PRICE = 120;

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    checkedIn: 0,
    paid: 0,
    remaining: 0,
    checkInRate: 0,
    revenue: 0,
    recentCheckIns: []
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    loadStats();
    
    // Update stats every 10 seconds
    const interval = setInterval(loadStats, 10000);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && distance <= 100) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await loadStats();
      setIsRefreshing(false);
    }
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.clientY);
      setIsPulling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const distance = e.clientY - startY;
    
    if (distance > 0 && distance <= 100) {
      setPullDistance(distance);
    }
  };

  const handleMouseUp = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await loadStats();
      setIsRefreshing(false);
    }
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  };

  const loadStats = async () => {
    try {
      const rows = await sheetsService.getRows();
      
      // Table starts at row 3, so skip first 2 rows (title + header)
      const dataRows = rows.slice(2).filter(row => {
        if (!row || row.length === 0) return false;
        
        const ticketNumber = row[0];
        const name = row[1];
        const phoneNumber = row[2];
        
        // Only count rows that have ALL required fields (ticket, name, phone)
        const hasTicket = ticketNumber !== undefined && 
                         ticketNumber !== null && 
                         String(ticketNumber).trim() !== '';
                         
        const hasName = name !== undefined && 
                       name !== null && 
                       String(name).trim() !== '';
                       
        const hasPhone = phoneNumber !== undefined && 
                        phoneNumber !== null && 
                        String(phoneNumber).trim() !== '';
        
        // Must have at minimum ticket number and name
        return hasTicket && hasName && hasPhone;
      });
      
      const checkedIn = dataRows.filter(row => row[4] === 'Yes').length;
      const paid = dataRows.filter(row => row[3] === 'Yes').length;
      const total = dataRows.length;
      const remaining = total - checkedIn;
      const revenue = paid * TICKET_PRICE;
      const checkInRate = total > 0 ? (checkedIn / total) * 100 : 0;

      // Get recent check-ins (last 5) - need to check if timestamp exists
      const recentCheckIns = dataRows
        .filter(row => row[4] === 'Yes')
        .map(row => ({
          ticketNumber: String(row[0]),
          name: `${row[1]} ${row[2]}`,
          phoneNumber: String(row[2]),
          checkedIn: 'Just now' // Since we don't have timestamps in the sheet yet
        }))
        .slice(0, 5);

      setStats({
        total,
        checkedIn,
        paid,
        revenue,
        remaining,
        checkInRate,
        recentCheckIns
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (isRefreshing) {
    return <div className="dashboard-loading">Refreshing data...</div>;
  }

  return (
    <div 
      className="dashboard"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {(isPulling || isRefreshing) && (
        <div 
          className="pull-to-refresh-indicator" 
          style={{ 
            height: `${pullDistance}px`,
            opacity: pullDistance / 60
          }}
        >
          <div className="refresh-icon">
            {isRefreshing ? '⏳' : pullDistance > 60 ? '🔄' : '↓'}
          </div>
        </div>
      )}
      <div className="dashboard-header">
        <div className="header-left">
          <h2>📊 Event Dashboard</h2>
          <div className={`online-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-value">{stats.checkedIn}/{stats.total}</div>
          <div className="stat-label">Checked In</div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-value">${stats.revenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-detail">{stats.paid} tickets × $120</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.paid}</div>
          <div className="stat-label">Paid Tickets</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.remaining}</div>
          <div className="stat-label">Not Checked In</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.checkInRate.toFixed(1)}%</div>
          <div className="stat-label">Check-in Rate</div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${stats.checkInRate}%` }}
        />
      </div>

      <div className="recent-checkins">
        <h3>Recent Check-ins</h3>
        {stats.recentCheckIns.length > 0 ? (
          <ul>
            {stats.recentCheckIns.map((checkin, index) => (
              <li key={index}>
                <span className="ticket-number">#{checkin.ticketNumber.padStart(3, '0')}</span>
                <span className="guest-name">{checkin.name}</span>
                <span className="check-in-time">{checkin.checkedIn}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-checkins">No check-ins yet</p>
        )}
      </div>
    </div>
  );
}
