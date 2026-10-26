import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Clock, User, Eye, X } from 'lucide-react';
import { AuditLog } from '../types';
import { apiRequest } from '../lib/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [eventType, setEventType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventType && eventType !== 'ALL') params.append('eventType', eventType);
      if (search) params.append('search', search);

      const res = await apiRequest<{ logs: AuditLog[]; total: number }>(`/audit?${params.toString()}`);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-brand-600" />
          <span>System Audit Log & Security Trail</span>
        </h1>
        <p className="text-sm text-secondary-text mt-1">
          Immutable forensic logs of authentication events, bill deletions, KOT adjustments, and stock changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bento-card p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-secondary-text absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, reason, or entity ID..."
              className="w-full pl-9 pr-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="AUTH_LOGIN">Authentication Logins</option>
            <option value="BILL_FINALIZED">Bill Finalizations</option>
            <option value="BILL_DELETED">Admin Bill Deletions</option>
            <option value="KOT_DELETED">Admin KOT Deletions</option>
            <option value="ORDER_CANCELLED">Order Cancellations</option>
            <option value="STOCK_ADJUSTED">Stock Manual Adjustments</option>
            <option value="STOCK_PURCHASED">Stock Purchases</option>
          </select>

          <button
            type="submit"
            className="px-4 py-1.5 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 transition-colors shadow"
          >
            Filter Logs
          </button>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="bento-card overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-sm text-primary-text">Event Trail ({total})</h3>
          <span className="text-xs text-secondary-text">Admin Only View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Event Type</th>
                <th className="py-3 px-5">Action & Description</th>
                <th className="py-3 px-5">Entity</th>
                <th className="py-3 px-5">Performed By</th>
                <th className="py-3 px-5">Reason</th>
                <th className="py-3 px-5 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3.5 px-5 text-xs text-secondary-text whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.eventType.includes('DELETED')
                          ? 'bg-rose-100 text-rose-800'
                          : log.eventType.includes('LOGIN')
                          ? 'bg-blue-100 text-blue-800'
                          : log.eventType.includes('FINALIZED')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-semibold text-xs text-primary-text max-w-sm">
                    {log.action}
                  </td>

                  <td className="py-3.5 px-5 text-xs">
                    <span className="font-bold text-zinc-700">{log.entityType}</span>
                    <span className="block text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                      {log.entityId}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-xs text-zinc-800">
                    <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                    {log.performedBy?.role && (
                      <span className="block text-[10px] text-zinc-400">{log.performedBy.role}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-zinc-600 italic">
                    {log.reason || '—'}
                  </td>

                  <td className="py-3.5 px-5 text-center">
                    {log.details ? (
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="p-1.5 text-zinc-500 hover:text-brand-600 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
                        title="Inspect JSON payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="p-12 text-center text-zinc-400">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-zinc-600">No matching audit logs found.</p>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-lg w-full p-6 border border-border shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="font-bold text-sm text-primary-text">
                Audit Payload Inspector: {inspectLog.eventType}
              </h4>
              <button onClick={() => setInspectLog(null)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <pre className="p-3 bg-zinc-900 text-emerald-400 rounded-bento-sm text-xs font-mono overflow-x-auto max-h-72">
              {JSON.stringify(JSON.parse(inspectLog.details || '{}'), null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
