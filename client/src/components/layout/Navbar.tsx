import React, { useState, useEffect } from 'react';
import { Bell, Clock, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const lowStock = await apiRequest<any[]>('/inventory/low-stock');
        setLowStockCount(lowStock.length);
      } catch (e) {
        // Ignore
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Current Time & Date */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-secondary-text font-medium">
          <Clock className="w-4 h-4 text-brand-600" />
          <span>
            {currentTime.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' • '}
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Right: Low stock badge, Role status & profile */}
      <div className="flex items-center space-x-4">
        {lowStockCount > 0 && (
          <Link
            to="/inventory"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{lowStockCount} Low Stock Item{lowStockCount > 1 ? 's' : ''}</span>
          </Link>
        )}

        <div className="flex items-center space-x-2 pl-2 border-l border-border">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-secondary-text">
            Server Validated • {isAdmin ? 'Full Admin Access' : 'Staff Mode'}
          </span>
        </div>
      </div>
    </header>
  );
};
