import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Utensils, Shield, User, ArrowRight, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await login(username, password);
      success(`Welcome back to Hungry Spoon!`);
    } catch (err: any) {
      error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F4] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/uploads/logo.jpg"
            alt="Hungry Spoon"
            className="w-20 h-20 mx-auto rounded-2xl object-contain shadow-lg mb-4 transform hover:scale-105 transition-transform"
          />
          <h1 className="text-3xl font-extrabold text-primary-text tracking-tight">Hungry Spoon</h1>
          <p className="text-sm text-secondary-text mt-1.5 font-medium">
            Restaurant Operating System & Management Suite
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-bento border border-border shadow-bento p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or staff"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-border rounded-bento-sm text-sm text-primary-text focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                />
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-border rounded-bento-sm text-sm text-primary-text focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-brand-600 text-white rounded-bento-sm font-semibold text-sm hover:bg-brand-700 transition-colors shadow flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Restaurant OS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-secondary-text font-semibold uppercase tracking-wider mb-3 text-center">
              Quick Sign-in (Demo Accounts)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin', 'admin123')}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-bento-sm text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff', 'staff123')}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-bento-sm text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <Utensils className="w-3.5 h-3.5 text-blue-600" />
                <span>Staff Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-400 mt-6 font-medium">
          Hungry Spoon POS v1.0 • Secure Server Authentication
        </p>
      </div>
    </div>
  );
};
