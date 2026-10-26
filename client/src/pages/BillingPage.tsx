import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  CreditCard,
  DollarSign,
  AlertCircle,
  FileText,
  Percent,
} from 'lucide-react';
import { Order, CustomerBill, RestaurantSettings } from '../types';
import { apiRequest, formatINR } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ReceiptPrinter } from '../components/printing/ReceiptPrinter';

export const BillingPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Finalize Bill Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [finalizing, setFinalizing] = useState(false);

  // Payment Recording Modal State
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<CustomerBill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'OTHER'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Printing State
  const [printingBill, setPrintingBill] = useState<CustomerBill | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  const fetchOrders = async () => {
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        apiRequest<{ orders: Order[] }>('/orders?limit=100'),
        apiRequest<RestaurantSettings>('/settings'),
      ]);
      setOrders(ordersRes.orders);
      setSettings(settingsRes);
    } catch (e) {
      console.error('Failed to load orders for billing:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter orders that need billing (exclude cancelled and already completed orders where bill is already paid)
  const billingOrders = orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const openFinalizeModal = (order: Order) => {
    setSelectedOrder(order);
    setDiscount(order.discount || 0);
    setDiscountReason('');
  };

  const handleFinalizeBill = async () => {
    if (!selectedOrder) return;
    setFinalizing(true);
    try {
      const res = await apiRequest<CustomerBill>('/billing/finalize', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          discount: Number(discount),
          discountReason: discountReason.trim() || undefined,
        }),
      });

      success(`Customer Bill #${res.billNumber} successfully finalized!`);
      setSelectedOrder(null);
      fetchOrders();

      // Open print preview automatically for convenience
      setPrintingBill(res);
    } catch (err: any) {
      error(err.message || 'Failed to finalize bill');
    } finally {
      setFinalizing(false);
    }
  };

  const openPaymentModal = (bill: CustomerBill) => {
    setSelectedBillForPayment(bill);
    const alreadyPaid = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = Math.max(0, bill.grandTotal - alreadyPaid);
    setPaymentAmount(balance);
    setReferenceNumber('');
  };

  const handleRecordPayment = async () => {
    if (!selectedBillForPayment || paymentAmount <= 0) {
      warning('Please enter a valid payment amount.');
      return;
    }

    setRecordingPayment(true);
    try {
      await apiRequest(`/billing/${selectedBillForPayment.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
        }),
      });

      success(`Payment of ${formatINR(paymentAmount)} recorded successfully!`);
      setSelectedBillForPayment(null);
      fetchOrders();
    } catch (err: any) {
      error(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            <span>Customer Billing & Checkout</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Review active table orders, finalize invoices, collect payments, and print thermal/A4 receipts.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-secondary-text absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order # or Table..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-bento-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bento-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-base text-primary-text">Active Order Billing Queue</h3>
          <span className="text-xs font-semibold text-secondary-text">
            {billingOrders.length} Order{billingOrders.length !== 1 ? 's' : ''} Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
              <tr>
                <th className="py-3 px-5">Order #</th>
                <th className="py-3 px-5">Type / Table</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5">Kitchen Status</th>
                <th className="py-3 px-5 text-right">Order Total</th>
                <th className="py-3 px-5">Bill Status</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {billingOrders.map((order) => {
                const bill = order.bill;
                const isFinalized = !!bill;
                const isPaid = bill?.paymentStatus === 'PAID';

                return (
                  <tr key={order.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-primary-text">
                      {order.orderNumber}
                      <span className="block text-[11px] font-normal text-secondary-text">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span className="font-medium text-primary-text">
                        {order.tableNumber || 'Unassigned'}
                      </span>
                      <span className="block text-xs text-secondary-text">{order.orderType}</span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span className="font-medium">{order.items?.length || 0} Items</span>
                      <span className="block text-xs text-secondary-text truncate max-w-xs">
                        {order.items?.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                          order.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'PREPARING'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'SENT_TO_KITCHEN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right font-extrabold text-primary-text">
                      {formatINR(order.grandTotal)}
                    </td>

                    <td className="py-3.5 px-5">
                      {isFinalized ? (
                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {bill.paymentStatus}
                          </span>
                          <span className="block text-[11px] font-mono text-zinc-500 mt-0.5">
                            {bill.billNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-600">
                          Unbilled
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {!isFinalized ? (
                          <button
                            type="button"
                            onClick={() => openFinalizeModal(order)}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-bento-sm text-xs font-semibold shadow transition-colors"
                          >
                            Generate Bill
                          </button>
                        ) : (
                          <>
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(bill)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-bento-sm text-xs font-semibold shadow transition-colors flex items-center space-x-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Record Pay</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPrintingBill(bill)}
                              title="Print Receipt"
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-bento-sm transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {billingOrders.length === 0 && (
          <div className="p-12 text-center text-zinc-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-zinc-600">No active orders waiting for billing.</p>
          </div>
        )}
      </div>

      {/* ===================== FINALIZE BILL MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-lg w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-lg text-primary-text">
                  Finalize Bill for Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-secondary-text">
                  {selectedOrder.orderType} • {selectedOrder.tableNumber || 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Order Items Table Preview */}
            <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 border rounded-bento-sm p-3 bg-zinc-50 text-xs">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1.5">
                  <span className="font-medium text-primary-text">
                    {item.quantity}x {item.itemName}
                  </span>
                  <span className="font-bold">{formatINR(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Discount Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedOrder.subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Discount Reason / Promo
                </label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. Happy Hours, Manager Comp"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Calculations Preview */}
            <div className="p-3 bg-brand-50/50 rounded-bento-sm border border-brand-200/50 text-xs space-y-1.5">
              <div className="flex justify-between text-secondary-text">
                <span>Subtotal:</span>
                <span>{formatINR(selectedOrder.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span>-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-secondary-text">
                <span>GST (5%):</span>
                <span>
                  {formatINR(Math.round(Math.max(0, selectedOrder.subtotal - discount) * 0.05 * 100) / 100)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-primary-text pt-1 border-t border-brand-200">
                <span>Authoritative Grand Total:</span>
                <span className="text-brand-600">
                  {formatINR(
                    Math.round(
                      (Math.max(0, selectedOrder.subtotal - discount) * 1.05) * 100
                    ) / 100
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-border rounded-bento-sm text-xs font-semibold text-secondary-text hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={finalizing}
                onClick={handleFinalizeBill}
                className="px-4 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow disabled:opacity-50"
              >
                {finalizing ? 'Finalizing Invoice...' : 'Confirm & Finalize Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RECORD PAYMENT MODAL ===================== */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-lg text-primary-text">Record Customer Payment</h3>
                <p className="text-xs text-secondary-text">
                  Bill #{selectedBillForPayment.billNumber} • Total: {formatINR(selectedBillForPayment.grandTotal)}
                </p>
              </div>
              <button
                onClick={() => setSelectedBillForPayment(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Amount Received (₹)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-bold text-primary-text focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['UPI', 'CASH', 'CARD', 'OTHER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 text-xs font-bold rounded-bento-sm border text-center transition-all ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-zinc-50 border-border text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Transaction / Reference # (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UPI Ref / Card Last 4 digits"
                className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedBillForPayment(null)}
                className="px-4 py-2 border border-border rounded-bento-sm text-xs font-semibold text-secondary-text hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recordingPayment || paymentAmount <= 0}
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-emerald-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-emerald-700 shadow disabled:opacity-50"
              >
                {recordingPayment ? 'Recording...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {printingBill && (
        <ReceiptPrinter
          bill={printingBill}
          settings={settings}
          onClose={() => setPrintingBill(null)}
        />
      )}
    </div>
  );
};
