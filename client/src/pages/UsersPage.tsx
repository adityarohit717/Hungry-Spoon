import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, CheckCircle, XCircle, X, Lock, Mail, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { apiRequest } from '../lib/api';
import { useToast } from '../context/ToastContext';

export const UsersPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'ADMIN'>('STAFF');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<User[]>('/users');
      setUsers(res);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, name, password, role }),
      });
      success(`User account for "${name}" created successfully.`);
      setIsCreating(false);
      setUsername('');
      setEmail('');
      setName('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await apiRequest(`/users/${user.id}/toggle-status`, { method: 'PATCH' });
      success(`Status for "${user.name}" updated.`);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Staff & User Role Administration</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage authenticated team members, role privileges (Admin vs Staff), and account access.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow transition-colors flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bento-card overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-sm text-primary-text">Authorized Users ({users.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
              <tr>
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-5">Username</th>
                <th className="py-3 px-5">Email</th>
                <th className="py-3 px-5">Role Permission</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Toggle Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-primary-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-brand-600 font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>

                  <td className="py-3.5 px-5 text-xs font-mono text-zinc-600">{u.username}</td>

                  <td className="py-3.5 px-5 text-xs text-secondary-text">{u.email}</td>

                  <td className="py-3.5 px-5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`px-3 py-1 rounded-bento-sm text-xs font-semibold transition-colors ${
                        u.isActive
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-base text-primary-text">Create User Account</h3>
              <button onClick={() => setIsCreating(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rahul"
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="STAFF">STAFF (Orders & Billing)</option>
                    <option value="ADMIN">ADMIN (Full Permissions)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@hungryspoon.com"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-secondary-text hover:bg-zinc-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 text-white rounded-md text-xs font-semibold hover:bg-brand-700 shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
