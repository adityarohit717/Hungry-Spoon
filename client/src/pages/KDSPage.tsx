import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle,
  Play,
  RotateCw,
  Search,
  AlertCircle,
  Utensils,
} from 'lucide-react';
import { KOT } from '../types';
import { apiRequest } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { KOTPrinter } from '../components/printing/KOTPrinter';

export const KDSPage: React.FC = () => {
  const { success, error } = useToast();
  const [kots, setKots] = useState<KOT[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [printingKot, setPrintingKot] = useState<KOT | null>(null);

  const fetchKOTs = async () => {
    try {
      const res = await apiRequest<{ kots: KOT[] }>('/kot', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      setKots(res.kots);
    } catch (e) {
      console.error('Failed to load KOTs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKOTs();
    const interval = setInterval(fetchKOTs, 5000); // Poll kitchen orders every 5s
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (kotId: string, newStatus: string) => {
    try {
      await apiRequest(`/kot/${kotId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      success(`KOT updated to ${newStatus}`);
      fetchKOTs();
    } catch (err: any) {
      error(err.message || 'Failed to update KOT status');
    }
  };

  // Helper for elapsed time
  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };

  // Filter KOTs
  const filteredKOTs = kots.filter((kot) => {
    const matchesSearch =
      kot.kotNumber.toLowerCase().includes(search.toLowerCase()) ||
      (kot.tableNumber && kot.tableNumber.toLowerCase().includes(search.toLowerCase())) ||
      (kot.order?.orderNumber && kot.order.orderNumber.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') {
      return kot.status === 'SENT_TO_KITCHEN' || kot.status === 'PREPARING';
    }
    if (statusFilter === 'READY') {
      return kot.status === 'READY';
    }
    if (statusFilter === 'SERVED') {
      return kot.status === 'SERVED';
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-brand-600" />
            <span>Kitchen Display System (KDS)</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Live real-time order queue for chef and kitchen line. Auto-refreshes every 5s.
          </p>
        </div>

        {/* Filter Tabs & Manual Refresh */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-zinc-200/70 p-1 rounded-bento-sm text-xs font-semibold">
            {[
              { id: 'ACTIVE', label: 'Active Queue' },
              { id: 'READY', label: 'Ready for Pickup' },
              { id: 'SERVED', label: 'Served' },
              { id: 'ALL', label: 'All Tickets' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-primary-text shadow-sm'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchKOTs}
            title="Refresh Orders"
            className="p-2 bg-white border border-border text-zinc-600 hover:text-black rounded-bento-sm shadow-sm transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-secondary-text absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by KOT number, Table, or Order..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-bento-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Tickets Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredKOTs.map((kot) => {
          const elapsed = getElapsedMinutes(kot.createdAt);
          const isUrgent = elapsed >= 20;
          const isDelayed = elapsed >= 10 && elapsed < 20;

          return (
            <div
              key={kot.id}
              className={`bento-card p-5 flex flex-col justify-between border-2 transition-all ${
                kot.status === 'READY'
                  ? 'border-emerald-500/50 bg-emerald-50/10'
                  : isUrgent
                  ? 'border-red-400 bg-red-50/20'
                  : isDelayed
                  ? 'border-amber-400 bg-amber-50/10'
                  : 'border-border'
              }`}
            >
              {/* Ticket Header */}
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-primary-text">{kot.kotNumber}</span>
                      {kot.version > 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                          REV v{kot.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-zinc-700 mt-0.5">
                      {kot.orderType} • <span className="text-brand-600">{kot.tableNumber || 'Unassigned'}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">Order: {kot.order?.orderNumber}</p>
                  </div>

                  {/* Timer Pill */}
                  <div
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isUrgent
                        ? 'bg-red-100 text-red-800 animate-pulse'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m ago</span>
                  </div>
                </div>

                {/* Notes */}
                {kot.notes && (
                  <div className="p-2 my-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-medium">
                    <span className="font-bold">Order Note:</span> {kot.notes}
                  </div>
                )}

                {/* Items List */}
                <div className="py-3 space-y-2.5">
                  {kot.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-lg text-xs ${
                        item.isAmendment
                          ? 'bg-amber-100/70 border border-amber-300 font-semibold'
                          : 'bg-zinc-50 border border-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-primary-text">
                          <span className="text-brand-600 font-black">{item.quantity}x</span> {item.itemName}
                        </span>
                        {item.isAmendment && (
                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                            Amendment
                          </span>
                        )}
                      </div>
                      {item.instructions && (
                        <p className="text-[11px] text-zinc-600 italic mt-1 pl-2 border-l-2 border-brand-500">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Controls Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPrintingKot(kot)}
                  title="Print Ticket Slip"
                  className="p-2 rounded-bento-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <div className="flex-1 flex gap-2 justify-end">
                  {kot.status === 'SENT_TO_KITCHEN' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(kot.id, 'PREPARING')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-bento-sm text-xs font-bold transition-colors shadow flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {kot.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(kot.id, 'READY')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-bento-sm text-xs font-bold transition-colors shadow flex items-center space-x-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {kot.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(kot.id, 'SERVED')}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-bento-sm text-xs font-bold transition-colors shadow flex items-center space-x-1.5"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Mark Served</span>
                    </button>
                  )}

                  {kot.status === 'SERVED' && (
                    <span className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-bento-sm">
                      Completed & Served
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredKOTs.length === 0 && (
        <div className="py-16 text-center text-zinc-400 bento-card p-12">
          <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <h3 className="font-bold text-base text-zinc-600">No Kitchen Tickets in this Queue</h3>
          <p className="text-xs text-zinc-400 mt-1">Orders dispatched from POS will show up here automatically.</p>
        </div>
      )}

      {/* KOT Print Modal */}
      {printingKot && (
        <KOTPrinter kot={printingKot} onClose={() => setPrintingKot(null)} />
      )}
    </div>
  );
};
