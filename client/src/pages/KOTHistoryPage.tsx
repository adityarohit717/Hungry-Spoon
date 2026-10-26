import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Printer,
  Trash2,
  ChefHat,
  Filter,
} from 'lucide-react';
import { KOT } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { KOTPrinter } from '../components/printing/KOTPrinter';
import { AdminConfirmDialog } from '../components/common/AdminConfirmDialog';

export const KOTHistoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [kots, setKots] = useState<KOT[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [printingKot, setPrintingKot] = useState<KOT | null>(null);
  const [deletingKot, setDeletingKot] = useState<KOT | null>(null);

  const fetchKOTs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'ALL') params.append('status', status);

      const res = await apiRequest<{ kots: KOT[]; total: number }>(`/kot?${params.toString()}`);
      setKots(res.kots);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load KOT history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKOTs();
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKOTs();
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!deletingKot) return;
    try {
      await apiRequest(`/kot/${deletingKot.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          confirm: true,
          reason,
        }),
      });

      success(`KOT #${deletingKot.kotNumber} permanently deleted.`);
      setDeletingKot(null);
      fetchKOTs();
    } catch (err: any) {
      error(err.message || 'Failed to delete KOT');
      throw err;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-600" />
            <span>Kitchen Order Ticket (KOT) History</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Complete operational kitchen audit history, preparation statuses, and ticket reprints.
          </p>
        </div>
      </div>

      {/* Filter Bento Card */}
      <div className="bento-card p-5 bg-white">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Search KOT, Order, or Table
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-secondary-text absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search KOT #, Order #, Table..."
                className="w-full pl-9 pr-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Kitchen Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Kitchen Statuses</option>
                <option value="SENT_TO_KITCHEN">Sent to Kitchen</option>
                <option value="PREPARING">Preparing (Cooking)</option>
                <option value="READY">Ready</option>
                <option value="SERVED">Served</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 transition-colors shadow"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* KOTs Table Card */}
      <div className="bento-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary-text">
            KOT Records ({total})
          </h3>
          <span className="text-xs text-secondary-text">Kitchen tickets generated for chef station</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
              <tr>
                <th className="py-3 px-5">KOT #</th>
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Associated Order</th>
                <th className="py-3 px-5">Table / Type</th>
                <th className="py-3 px-5">Items Summary</th>
                <th className="py-3 px-5">Kitchen Status</th>
                <th className="py-3 px-5">Customer Bill</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {kots.map((kot) => {
                const bill = kot.order?.bill;
                return (
                  <tr key={kot.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-primary-text font-mono">
                      <div className="flex items-center space-x-1.5">
                        <span>{kot.kotNumber}</span>
                        {kot.version > 1 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            v{kot.version}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-xs text-secondary-text">
                      {new Date(kot.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' • '}
                      {new Date(kot.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-5 font-semibold text-primary-text">
                      {kot.order?.orderNumber}
                    </td>

                    <td className="py-3.5 px-5">
                      <span className="font-medium text-primary-text">
                        {kot.tableNumber || 'No Table'}
                      </span>
                      <span className="block text-xs text-secondary-text">{kot.orderType}</span>
                    </td>

                    <td className="py-3.5 px-5 text-xs">
                      <span className="font-semibold">{kot.items.length} items</span>
                      <span className="block text-zinc-400 truncate max-w-xs">
                        {kot.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                          kot.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : kot.status === 'PREPARING'
                            ? 'bg-amber-100 text-amber-800'
                            : kot.status === 'SENT_TO_KITCHEN'
                            ? 'bg-blue-100 text-blue-800'
                            : kot.status === 'SERVED'
                            ? 'bg-zinc-100 text-zinc-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {kot.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-xs">
                      {bill ? (
                        <span className="text-emerald-700 font-semibold font-mono">
                          {bill.billNumber} ({bill.paymentStatus})
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">No bill yet</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPrintingKot(kot)}
                          className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-bento-sm text-xs font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint KOT</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeletingKot(kot)}
                            title="Admin Permanent Delete"
                            className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-bento-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {kots.length === 0 && !loading && (
          <div className="p-12 text-center text-zinc-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-zinc-600">No matching KOT records found.</p>
          </div>
        )}
      </div>

      {/* KOT Print Slip Modal */}
      {printingKot && (
        <KOTPrinter kot={printingKot} onClose={() => setPrintingKot(null)} />
      )}

      {/* Admin Delete KOT Confirmation Dialog */}
      {deletingKot && (
        <AdminConfirmDialog
          isOpen={!!deletingKot}
          title={`Permanent Deletion of Kitchen Ticket`}
          description={`You are about to permanently delete KOT #${deletingKot.kotNumber} (Order #${deletingKot.order?.orderNumber}). Only administrators can purge kitchen tickets. This action will be recorded in the audit log.`}
          entityNumber={deletingKot.kotNumber}
          relatedInfo={`Order: ${deletingKot.order?.orderNumber} • Table: ${deletingKot.tableNumber} • Bill Exists: ${deletingKot.order?.bill ? 'Yes' : 'No'}`}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingKot(null)}
        />
      )}
    </div>
  );
};
