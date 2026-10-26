import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Utensils,
  ShoppingBag,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { apiRequest, formatINR, getAuthToken } from '../lib/api';

const COLORS = ['#EA580C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export const ReportsPage: React.FC = () => {
  const [salesData, setSalesData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiRequest(`/reports/sales?${params.toString()}`);
      setSalesData(res);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    const token = getAuthToken();
    const url = `/api/reports/export/sales-csv${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
  };

  const { summary, paymentStats, orderTypeStats } = salesData || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <span>Financial & Operational Reporting</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Reconciliation of gross revenue, discounts, GST tax liability, and sales channels.
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-xs text-zinc-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
          />

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-emerald-700 shadow transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bento-card p-4 bg-gradient-to-br from-white via-white to-brand-50/40 border-brand-300">
          <span className="text-[11px] font-bold text-brand-700 uppercase">Net Sales (Revenue)</span>
          <p className="text-2xl font-black text-primary-text mt-1">
            {formatINR(summary?.netSales || 0)}
          </p>
          <span className="text-[10px] text-zinc-400">Post-tax & discount</span>
        </div>

        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-secondary-text uppercase">Gross Item Sales</span>
          <p className="text-2xl font-bold text-primary-text mt-1">
            {formatINR(summary?.grossSales || 0)}
          </p>
          <span className="text-[10px] text-zinc-400">Before discounts & taxes</span>
        </div>

        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Total Discounts</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(summary?.totalDiscounts || 0)}
          </p>
          <span className="text-[10px] text-zinc-400">Promos & customer waivers</span>
        </div>

        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-secondary-text uppercase">GST Tax Collected</span>
          <p className="text-2xl font-bold text-primary-text mt-1">
            {formatINR(summary?.totalTaxes || 0)}
          </p>
          <span className="text-[10px] text-zinc-400">Output tax liability</span>
        </div>

        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-secondary-text uppercase">Avg Order Value (AOV)</span>
          <p className="text-2xl font-bold text-primary-text mt-1">
            {formatINR(summary?.averageOrderValue || 0)}
          </p>
          <span className="text-[10px] text-zinc-400">Across {summary?.totalBills || 0} bills</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods Chart */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-primary-text flex items-center gap-2 pb-2 border-b border-border">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span>Payment Method Breakdown</span>
            </h3>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats || []}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.method}: ₹${entry.total}`}
                  >
                    {(paymentStats || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹${value}`, 'Collected']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
            {paymentStats?.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between p-2 bg-zinc-50 rounded">
                <span className="font-semibold text-zinc-700">{p.method}</span>
                <span className="font-bold">{formatINR(p.total)} ({p.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Types Chart */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-primary-text flex items-center gap-2 pb-2 border-b border-border">
              <ShoppingBag className="w-4 h-4 text-brand-600" />
              <span>Revenue by Dining Channel</span>
            </h3>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderTypeStats || []} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val: any) => [`₹${val}`, 'Sales']} />
                  <Bar dataKey="total" fill="#EA580C" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-xs text-center">
            {orderTypeStats?.map((o: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-50 rounded">
                <span className="text-zinc-500 block uppercase font-bold text-[10px]">{o.type}</span>
                <span className="font-extrabold text-primary-text">{formatINR(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
