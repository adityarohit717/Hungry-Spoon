import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  History,
  ClipboardList,
  BookOpen,
  Boxes,
  BarChart3,
  ShieldAlert,
  Users,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Point of Sale (POS)', path: '/pos', icon: UtensilsCrossed },
    { name: 'Kitchen Display (KDS)', path: '/kds', icon: ChefHat },
    { name: 'Active Billing', path: '/billing', icon: Receipt },
    { name: 'Bill History', path: '/bills', icon: History },
    { name: 'KOT History', path: '/kots', icon: ClipboardList },
    { name: 'Menu & Recipes', path: '/menu', icon: BookOpen },
    { name: 'Stock & Inventory', path: '/inventory', icon: Boxes },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ...(isAdmin
      ? [
          { name: 'Audit Logs', path: '/audit', icon: ShieldAlert },
          { name: 'Staff Management', path: '/users', icon: Users },
          { name: 'Settings', path: '/settings', icon: Settings },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-sidebar text-zinc-300 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-zinc-800 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/uploads/logo.jpg"
            alt="Hungry Spoon"
            className="w-10 h-10 rounded-xl object-contain shadow-md"
          />
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              Hungry Spoon
            </h1>
            <p className="text-xs text-zinc-400 font-medium tracking-wide">Restaurant OS</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-bento-sm text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* User & Role Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-brand-500">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
