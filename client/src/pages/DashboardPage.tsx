import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  ChefHat,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  UtensilsCrossed,
  Boxes,
  BarChart2,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiRequest, formatINR } from '../lib/api';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await apiRequest('/reports/dashboard');
      setData(res);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // live update
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-zinc-200 animate-pulse rounded-lg w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-200 animate-pulse rounded-bento" />
          ))}
        </div>
      </div>
    );
  }

  const { metrics, salesTrend, popularItems, latestBills, activeKOTs } = data || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            Hungry Spoon Restaurant Operating System
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Real-time live kitchen, billing, and inventory performance.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/pos"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>New POS Order</span>
          </Link>
          <Link
            to="/kds"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-bento-sm text-xs font-semibold hover:bg-black transition-colors shadow-sm"
          >
            <ChefHat className="w-4 h-4" />
            <span>Open Kitchen Display</span>
          </Link>
          <Link
            to="/billing"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-border text-primary-text rounded-bento-sm text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Receipt className="w-4 h-4 text-brand-600" />
            <span>Customer Billing</span>
          </Link>
        </div>
      </div>

      {/* ===================== BENTO GRID ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Metric 1: Today's Revenue (Large Card - 4 cols) */}
        <div className="md:col-span-4 bento-card p-6 flex flex-col justify-between border-brand-500/30 bg-gradient-to-br from-white via-white to-brand-50/50">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-text">
                Today's Sales Revenue
              </span>
              <div className="p-2 bg-brand-100 rounded-xl text-brand-600">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold text-primary-text tracking-tight">
                {formatINR(metrics?.todaySales || 0)}
              </h2>
              <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Live from finalized invoices</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border flex justify-between text-xs text-secondary-text">
            <span>Avg Order Value:</span>
            <span className="font-bold text-primary-text">
              {formatINR(metrics?.averageOrderValue || 0)}
            </span>
          </div>
        </div>

        {/* Metric 2: Today's Orders (Medium - 3 cols) */}
        <div className="md:col-span-3 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-text">
                Orders Today
              </span>
              <div className="p-2 bg-zinc-100 rounded-xl text-zinc-700">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold text-primary-text tracking-tight">
                {metrics?.todayOrdersCount || 0}
              </h2>
              <p className="text-xs text-secondary-text mt-1">
                {metrics?.completedOrders || 0} Completed / Paid
              </p>
            </div>
          </div>

          <Link
            to="/bills"
            className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <span>View All Bill Records</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metric 3: Active Kitchen Orders (Medium - 2 cols) */}
        <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between bg-zinc-900 text-white">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                In Kitchen
              </span>
              <div className="p-2 bg-zinc-800 rounded-xl text-amber-400">
                <ChefHat className="w-5 h-5 animate-bounce" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {metrics?.activeKitchenOrders || 0}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Active KOT tickets</p>
            </div>
          </div>

          <Link
            to="/kds"
            className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            <span>Kitchen View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metric 4: Low Stock Alert Card (3 cols) */}
        <div
          className={`md:col-span-3 bento-card p-6 flex flex-col justify-between ${
            (metrics?.lowStockCount || 0) > 0
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-border'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-text">
                Stock Status
              </span>
              <div
                className={`p-2 rounded-xl ${
                  (metrics?.lowStockCount || 0) > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-extrabold text-primary-text tracking-tight">
                {metrics?.lowStockCount || 0}
              </h2>
              <p className="text-xs text-secondary-text mt-1">
                {(metrics?.lowStockCount || 0) > 0
                  ? 'Ingredients at or below threshold'
                  : 'All stock at healthy levels'}
              </p>
            </div>
          </div>

          <Link
            to="/inventory"
            className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            <span>Manage Inventory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Row 2: Sales Chart Card (8 cols) */}
        <div className="md:col-span-8 bento-card p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="font-bold text-base text-primary-text flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-600" />
                <span>Revenue Performance (Last 7 Days)</span>
              </h3>
              <p className="text-xs text-secondary-text">Aggregated from verified customer bills</p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#EA580C" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Popular Menu Items (4 cols) */}
        <div className="md:col-span-4 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-primary-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bestselling Items</span>
              </h3>
              <span className="text-[11px] font-semibold text-secondary-text">By volume</span>
            </div>

            <div className="mt-4 space-y-3">
              {popularItems && popularItems.length > 0 ? (
                popularItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-primary-text truncate">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="font-bold text-primary-text">{item.quantity} sold</span>
                      <span className="block text-[10px] text-secondary-text">{formatINR(item.revenue)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-secondary-text text-center py-8">No order items recorded yet.</p>
              )}
            </div>
          </div>

          <Link
            to="/menu"
            className="pt-4 border-t border-border text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center justify-between"
          >
            <span>Manage Menu & Recipes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Row 3: Active Kitchen Tickets (6 cols) */}
        <div className="md:col-span-6 bento-card p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h3 className="font-bold text-base text-primary-text flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-600" />
              <span>Active Kitchen Tickets (KOT)</span>
            </h3>
            <Link to="/kds" className="text-xs font-semibold text-brand-600 hover:underline">
              Live KDS Display →
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72">
            {activeKOTs && activeKOTs.length > 0 ? (
              activeKOTs.map((kot: any) => (
                <div key={kot.id} className="p-3 bg-zinc-50 rounded-bento-sm border border-border flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-primary-text">{kot.kotNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {kot.status}
                      </span>
                    </div>
                    <p className="text-secondary-text mt-0.5">
                      {kot.orderType} • {kot.tableNumber || 'No Table'} • {kot.items.length} Items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-500 block">
                      {new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link to="/kds" className="text-[11px] font-semibold text-brand-600 hover:underline">
                      Open →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-secondary-text flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-60" />
                <p>Kitchen is clear! No pending orders.</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Recent Finalized Bills (6 cols) */}
        <div className="md:col-span-6 bento-card p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h3 className="font-bold text-base text-primary-text flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Recent Customer Invoices</span>
            </h3>
            <Link to="/bills" className="text-xs font-semibold text-brand-600 hover:underline">
              View History →
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72">
            {latestBills && latestBills.length > 0 ? (
              latestBills.map((bill: any) => (
                <div key={bill.id} className="p-3 bg-zinc-50 rounded-bento-sm border border-border flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-primary-text">{bill.billNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bill.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {bill.paymentStatus}
                      </span>
                    </div>
                    <p className="text-secondary-text mt-0.5">
                      Order: {bill.order?.orderNumber} • {bill.order?.orderType}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-primary-text block">{formatINR(bill.grandTotal)}</span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(bill.billDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-secondary-text text-center py-8">No finalized bills today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
