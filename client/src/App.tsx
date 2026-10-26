import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { KDSPage } from './pages/KDSPage';
import { BillingPage } from './pages/BillingPage';
import { BillHistoryPage } from './pages/BillHistoryPage';
import { KOTHistoryPage } from './pages/KOTHistoryPage';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#F7F7F4]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

const ProtectedRoutes: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F4] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <img
            src="/uploads/logo.jpg"
            alt="Hungry Spoon"
            className="w-16 h-16 rounded-2xl object-contain shadow-lg animate-pulse"
          />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Loading Hungry Spoon OS...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/kds" element={<KDSPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/bills" element={<BillHistoryPage />} />
        <Route path="/kots" element={<KOTHistoryPage />} />
        <Route path="/menu" element={<MenuManagementPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        {/* Admin only routes */}
        {isAdmin && (
          <>
            <Route path="/audit" element={<AuditLogsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </>
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ProtectedRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
