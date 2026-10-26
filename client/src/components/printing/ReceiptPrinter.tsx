import React, { useState } from 'react';
import { Printer, X, FileText, Receipt as ReceiptIcon, QrCode } from 'lucide-react';
import { CustomerBill, RestaurantSettings } from '../../types';
import { formatINR } from '../../lib/api';
import { printReceiptElement } from '../../lib/printUtils';

interface ReceiptPrinterProps {
  bill: CustomerBill;
  settings?: RestaurantSettings | null;
  onClose: () => void;
}

export const ReceiptPrinter: React.FC<ReceiptPrinterProps> = ({ bill, settings, onClose }) => {
  const [format, setFormat] = useState<'THERMAL' | 'A4'>('THERMAL');

  const defaultSettings: RestaurantSettings = {
    id: '',
    restaurantName: 'Hungry Spoon',
    tagline: 'Artisanal Flavors & Modern Dining',
    address: 'Upper Road Sultanganj, Sri Plaza First Floor 813213',
    phone: '9534188701',
    email: 'contact@hungryspoon.com',
    gstNumber: '29ABCDE1234F1Z5',
    fssaiNumber: '11223344556677',
    defaultTaxRate: 5.0,
    defaultServiceCharge: 0.0,
    currencySymbol: '₹',
    receiptHeaderMessage: 'Welcome to Hungry Spoon!',
    receiptFooterMessage: 'Thank you for dining with us! Visit again.',
    allowNegativeStock: false,
  };

  const s = settings || defaultSettings;
  const totalPaid = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const balanceDue = Math.max(0, bill.grandTotal - totalPaid);

  const handlePrint = () => {
    printReceiptElement('printable-receipt-root', `Bill_${bill.billNumber}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-bento max-w-2xl w-full p-6 shadow-2xl border border-border flex flex-col max-h-[92vh]">
        {/* Controls Header (no-print) */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-3 no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-lg text-primary-text">Print Customer Receipt</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format Toggle */}
            <div className="flex bg-zinc-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFormat('THERMAL')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  format === 'THERMAL' ? 'bg-white shadow text-brand-600' : 'text-zinc-600 hover:text-black'
                }`}
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>80mm Thermal</span>
              </button>
              <button
                onClick={() => setFormat('A4')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  format === 'A4' ? 'bg-white shadow text-brand-600' : 'text-zinc-600 hover:text-black'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 Standard</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-100/70 border rounded-xl flex justify-center">
          {format === 'THERMAL' ? (
            /* =================== 80mm THERMAL RECEIPT =================== */
            <div
              id="printable-receipt-root"
              className="thermal-receipt bg-white p-4 border border-dashed border-zinc-400 shadow-sm w-[300px] text-[11px] font-mono leading-tight text-zinc-950"
            >
              {/* Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-zinc-900">
                <img
                  src="/uploads/logo.jpg"
                  alt="Hungry Spoon Logo"
                  className="w-20 h-auto mx-auto mb-1.5 object-contain"
                />
                <h1 className="font-black text-lg tracking-wider uppercase">{s.restaurantName}</h1>
                <p className="text-[10px] text-zinc-700 font-semibold">{s.tagline}</p>
                <p className="text-[10px] text-zinc-800 mt-1 font-sans">{s.address}</p>
                <p className="text-[10px] text-zinc-900 font-bold">Ph: {s.phone}</p>
                {s.gstNumber && <p className="text-[10px] font-bold mt-0.5">GSTIN: {s.gstNumber}</p>}
                {s.fssaiNumber && <p className="text-[10px]">FSSAI: {s.fssaiNumber}</p>}
              </div>

              {/* Order Info */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>BILL NO:</span>
                  <span className="font-mono text-sm">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>ORDER / REF:</span>
                  <span>{bill.order?.orderNumber}</span>
                </div>
                {bill.order?.tableNumber && (
                  <div className="flex justify-between font-bold text-sm bg-zinc-100 p-0.5 rounded">
                    <span>NAME / TABLE:</span>
                    <span>{bill.order.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>TYPE:</span>
                  <span className="font-semibold">{bill.order?.orderType}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>DATE:</span>
                  <span>{new Date(bill.billDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-zinc-400">
                <div className="grid grid-cols-12 font-black pb-1 text-[11px] border-b border-zinc-300 mb-1">
                  <span className="col-span-6">ITEM</span>
                  <span className="col-span-2 text-center">QTY</span>
                  <span className="col-span-4 text-right">AMOUNT</span>
                </div>
                <div className="space-y-1.5">
                  {bill.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-[11px]">
                      <span className="col-span-6 font-bold leading-tight">{item.itemName}</span>
                      <span className="col-span-2 text-center font-bold">{item.quantity}</span>
                      <span className="col-span-4 text-right font-bold">{formatINR(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 border-b-2 border-dashed border-zinc-900 space-y-1 text-[11px]">
                <div className="flex justify-between font-semibold">
                  <span>SUBTOTAL:</span>
                  <span>{formatINR(bill.subtotal)}</span>
                </div>
                {bill.discount > 0 && (
                  <div className="flex justify-between text-zinc-700 font-bold">
                    <span>DISCOUNT ({bill.discountReason || 'PROMO'}):</span>
                    <span>-{formatINR(bill.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST ({bill.taxRate}%):</span>
                  <span>{formatINR(bill.taxAmount)}</span>
                </div>
                {bill.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>SERVICE CHARGE:</span>
                    <span>{formatINR(bill.serviceCharge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-1.5 border-t border-zinc-900">
                  <span>GRAND TOTAL:</span>
                  <span>{formatINR(bill.grandTotal)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>PAYMENT STATUS:</span>
                  <span className={bill.paymentStatus === 'PAID' ? 'text-black font-black' : 'text-red-700 font-black'}>
                    {bill.paymentStatus}
                  </span>
                </div>
                {bill.payments?.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-700">
                    <span>{p.paymentMethod} {p.referenceNumber ? `(${p.referenceNumber})` : ''}:</span>
                    <span className="font-bold">{formatINR(p.amount)}</span>
                  </div>
                ))}
                {balanceDue > 0 && (
                  <div className="flex justify-between font-black text-red-700">
                    <span>BALANCE DUE:</span>
                    <span>{formatINR(balanceDue)}</span>
                  </div>
                )}
              </div>

              {/* UPI QR CODE SECTION */}
              <div className="py-3 text-center border-b border-dashed border-zinc-400 bg-zinc-50 my-1 rounded p-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-900 mb-1 flex items-center justify-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan & Pay via UPI</span>
                </p>
                <div className="flex justify-center my-1.5">
                  <img
                    src="/upi-qr.jpg"
                    alt="PhonePe UPI QR Code"
                    className="w-40 h-auto rounded border border-zinc-300 shadow-sm object-contain"
                  />
                </div>
                <p className="text-[10px] font-bold text-zinc-800">PhonePe • GooglePay • Paytm • BHIM</p>
                <p className="text-[10px] font-extrabold text-zinc-950 mt-0.5">SANGITA DEVI (Hungry Spoon)</p>
                <p className="text-[9px] text-zinc-600">Mob: 9534188701</p>
              </div>

              {/* Closing Footer */}
              <div className="text-center pt-2 text-[10px] text-zinc-700 space-y-0.5">
                <p className="font-bold text-zinc-900">{s.receiptFooterMessage}</p>
                <p>Tax Invoice • All Inclusive</p>
                <p className="text-[9px] text-zinc-500">Thank You! Visit Again.</p>
              </div>
            </div>
          ) : (
            /* =================== A4 STANDARD INVOICE =================== */
            <div
              id="printable-receipt-root"
              className="a4-invoice bg-white p-8 border border-zinc-200 shadow-sm w-full max-w-[720px] text-sm text-zinc-800 font-sans"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-zinc-200">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <img
                      src="/uploads/logo.jpg"
                      alt="Hungry Spoon Logo"
                      className="w-14 h-auto object-contain"
                    />
                    <h1 className="text-2xl font-black text-brand-600 tracking-tight">
                      {s.restaurantName}
                    </h1>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">{s.tagline}</p>
                  <p className="text-xs text-zinc-700 mt-2 font-medium max-w-sm">{s.address}</p>
                  <p className="text-xs text-zinc-900 font-bold">Ph: {s.phone} | Email: {s.email}</p>
                  <div className="flex gap-4 mt-2 text-xs font-semibold text-zinc-700">
                    <span>GSTIN: {s.gstNumber}</span>
                    <span>FSSAI: {s.fssaiNumber}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-zinc-900 text-white font-black text-xs uppercase tracking-wider rounded mb-2">
                    TAX INVOICE
                  </span>
                  <p className="text-lg font-black text-zinc-900 font-mono">{bill.billNumber}</p>
                  <p className="text-xs text-zinc-600">Order: {bill.order?.orderNumber}</p>
                  {bill.order?.tableNumber && (
                    <p className="text-xs text-zinc-900 font-bold">Name/Table: {bill.order.tableNumber}</p>
                  )}
                  <p className="text-xs text-zinc-500">Date: {new Date(bill.billDate).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-zinc-700 font-semibold mt-1">
                    Channel: {bill.order?.orderType}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 text-xs font-bold text-zinc-600 uppercase">
                      <th className="py-2.5">#</th>
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Rate</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {bill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 font-bold text-zinc-900">{item.itemName}</td>
                        <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 text-right text-zinc-600 font-medium">{formatINR(item.unitPrice)}</td>
                        <td className="py-2.5 text-right font-bold text-zinc-900">{formatINR(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary, Totals & QR Code */}
              <div className="flex justify-between items-start pt-4 border-t-2 border-zinc-200 gap-6">
                {/* Left: UPI QR Code & Instructions */}
                <div className="flex items-center space-x-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <img
                    src="/upi-qr.jpg"
                    alt="PhonePe UPI QR Code"
                    className="w-28 h-auto rounded border border-zinc-300 shadow-sm object-contain"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-extrabold text-zinc-900 block text-sm">
                      Scan & Pay via UPI
                    </span>
                    <p className="text-zinc-600 text-[11px]">PhonePe, Google Pay, Paytm, BHIM</p>
                    <p className="font-bold text-zinc-900 text-xs">SANGITA DEVI (Hungry Spoon)</p>
                    <p className="text-zinc-600 text-[11px]">Mob: 9534188701</p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        bill.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Payment Status: {bill.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Right: Calculations Breakdown */}
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>Subtotal:</span>
                    <span>{formatINR(bill.subtotal)}</span>
                  </div>
                  {bill.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({bill.discountReason || 'Promo'}):</span>
                      <span>-{formatINR(bill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600 font-medium">
                    <span>CGST + SGST ({bill.taxRate}%):</span>
                    <span>{formatINR(bill.taxAmount)}</span>
                  </div>
                  {bill.serviceCharge > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Service Charge:</span>
                      <span>{formatINR(bill.serviceCharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-black text-zinc-950 pt-2 border-t-2 border-zinc-900">
                    <span>Grand Total:</span>
                    <span className="text-brand-600">{formatINR(bill.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* A4 Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-200 text-center text-xs text-zinc-500">
                <p className="font-bold text-zinc-700">{s.receiptFooterMessage}</p>
                <p className="mt-0.5">Hungry Spoon Restaurant • Sultanganj • Contact: 9534188701</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
