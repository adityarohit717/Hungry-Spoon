import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Printer,
  Trash2,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { CustomerBill, RestaurantSettings } from '../types';
import { apiRequest, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ReceiptPrinter } from '../components/printing/ReceiptPrinter';
import { AdminConfirmDialog } from '../components/common/AdminConfirmDialog';

export const BillHistoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [bills, setBills] = useState<CustomerBill[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [printingBill, setPrintingBill] = useState<CustomerBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<CustomerBill | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (paymentStatus && paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [billsRes, settingsRes] = await Promise.all([
        apiRequest<{ bills: CustomerBill[]; total: number }>(`/billing?${params.toString()}`),
        apiRequest<RestaurantSettings>('/settings'),
      ]);

      setBills(billsRes.bills);
      setTotal(billsRes.total);
      setSettings(settingsRes);
    } catch (e) {
      console.error('Failed to load bill history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [paymentStatus, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBills();
  };

  const handleConfirmDelete = async (reason: string, deleteAssociatedKOTs?: boolean) => {
    if (!deletingBill) return;
    try {
      await apiRequest(`/billing/${deletingBill.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          confirm: true,
          reason,
          deleteAssociatedKOTs: !!deleteAssociatedKOTs,
        }),
      });

      success(`Bill #${deletingBill.billNumber} permanently deleted.`);
      setDeletingBill(null);
      fetchBills();
    } catch (err: any) {
      error(err.message || 'Failed to delete customer bill');
      throw err;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <span>Customer Invoice & Bill History</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Archival records of finalized transactions, payments, reprint invoices, and administrative void management.
          </p>
        </div>
      </div>

      {/* Filter Bento Card */}
      <div className="bento-card p-5 bg-white">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Search Identifier
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-secondary-text absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bill #, Order #, Table..."
                className="w-full pl-9 pr-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid In Full</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* End Date & Submit */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
              />
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

      {/* Bills Table Card */}
      <div className="bento-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary-text">
            Finalized Invoices ({total})
          </h3>
          <span className="text-xs text-secondary-text">Immutable Historical Financial Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
              <tr>
                <th className="py-3 px-5">Bill #</th>
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Order # / Type</th>
                <th className="py-3 px-5">Table</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5 text-right">Grand Total</th>
                <th className="py-3 px-5">Payment Status</th>
                <th className="py-3 px-5">Billed By</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-primary-text font-mono">
                    {bill.billNumber}
                  </td>

                  <td className="py-3.5 px-5 text-xs text-secondary-text">
                    {new Date(bill.billDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' • '}
                    {new Date(bill.billDate).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-primary-text">
                      {bill.order?.orderNumber}
                    </span>
                    <span className="block text-xs text-secondary-text">
                      {bill.order?.orderType}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-medium">
                    {bill.order?.tableNumber || 'Unassigned'}
                  </td>

                  <td className="py-3.5 px-5 text-xs">
                    <span className="font-semibold">{bill.items.length} items</span>
                    <span className="block text-zinc-400 truncate max-w-xs">
                      {bill.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right font-black text-primary-text">
                    {formatINR(bill.grandTotal)}
                  </td>

                  <td className="py-3.5 px-5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                        bill.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : bill.paymentStatus === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {bill.paymentStatus}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-xs text-secondary-text">
                    {bill.finalizedBy?.name || 'System Staff'}
                  </td>

                  <td className="py-3.5 px-5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setPrintingBill(bill)}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-bento-sm text-xs font-semibold flex items-center space-x-1 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Reprint</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeletingBill(bill)}
                          title="Admin Permanent Delete"
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-bento-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bills.length === 0 && !loading && (
          <div className="p-12 text-center text-zinc-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-zinc-600">No matching bill records found.</p>
          </div>
        )}
      </div>

      {/* Print Receipt Modal */}
      {printingBill && (
        <ReceiptPrinter
          bill={printingBill}
          settings={settings}
          onClose={() => setPrintingBill(null)}
        />
      )}

      {/* Admin Delete Bill Confirmation Dialog */}
      {deletingBill && (
        <AdminConfirmDialog
          isOpen={!!deletingBill}
          title={`Permanent Deletion of Finalized Bill`}
          description={`You are about to permanently delete Customer Bill #${deletingBill.billNumber} (Order #${deletingBill.order?.orderNumber}) with total ${formatINR(deletingBill.grandTotal)}. Because this bill has recorded financial transactions, deleting it will update the financial ledger and log an immutable entry in the audit trail.`}
          entityNumber={deletingBill.billNumber}
          relatedInfo={`Order: ${deletingBill.order?.orderNumber} • Amount: ${formatINR(deletingBill.grandTotal)} • Payment: ${deletingBill.paymentStatus}`}
          isBillDeletion={true}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingBill(null)}
        />
      )}
    </div>
  );
};
