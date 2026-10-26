import React from 'react';
import { Printer, X, ChefHat } from 'lucide-react';
import { KOT } from '../../types';
import { printReceiptElement } from '../../lib/printUtils';

interface KOTPrinterProps {
  kot: KOT;
  onClose: () => void;
}

export const KOTPrinter: React.FC<KOTPrinterProps> = ({ kot, onClose }) => {
  const handlePrint = () => {
    printReceiptElement('printable-kot-root', `KOT_${kot.kotNumber}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border flex flex-col">
        {/* Header Controls (no-print) */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4 no-print">
          <div className="flex items-center space-x-2">
            <ChefHat className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-primary-text">Kitchen Order Ticket (KOT)</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KOT Slip (Thermal format) */}
        <div
          id="printable-kot-root"
          className="thermal-receipt bg-white p-4 border border-dashed border-zinc-500 shadow-sm text-zinc-950 font-mono text-[11px] leading-tight"
        >
          <div className="text-center pb-2 border-b-2 border-dashed border-zinc-900">
            <img
              src="/uploads/logo.jpg"
              alt="Hungry Spoon Logo"
              className="w-16 h-auto mx-auto mb-1 object-contain"
            />
            <h2 className="font-black text-lg uppercase tracking-wider">HUNGRY SPOON</h2>
            <p className="text-[10px] text-zinc-600">Upper Road Sultanganj, Sri Plaza 1st Floor</p>
            <p className="text-[10px] text-zinc-600">Ph: 9534188701</p>
            <div className="bg-zinc-900 text-white font-black px-2 py-1 mt-1 text-xs uppercase tracking-wide inline-block">
              *** KITCHEN ORDER TICKET ***
            </div>
            {kot.version > 1 && (
              <p className="text-[11px] font-black text-amber-700 mt-1 uppercase">
                *** AMENDMENT / REVISION v{kot.version} ***
              </p>
            )}
          </div>

          <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
            <div className="flex justify-between font-black text-sm">
              <span>ORDER / KOT:</span>
              <span className="font-mono text-brand-700">{kot.kotNumber}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>NAME / TABLE:</span>
              <span className="text-sm bg-zinc-100 px-1 rounded">{kot.tableNumber || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between">
              <span>ORDER TYPE:</span>
              <span className="font-semibold">{kot.orderType}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>REF NO:</span>
              <span>{kot.order?.orderNumber || kot.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>TIME:</span>
              <span>{new Date(kot.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            {kot.notes && (
              <div className="pt-1.5 text-zinc-800 font-sans italic border-t border-dotted border-zinc-300">
                <span className="font-bold font-mono uppercase not-italic">Order Note:</span> {kot.notes}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="py-2.5 border-b-2 border-dashed border-zinc-900">
            <div className="grid grid-cols-12 font-black pb-1.5 text-xs border-b border-zinc-400 mb-1.5">
              <span className="col-span-3 text-center">QTY</span>
              <span className="col-span-9">ITEM PARTICULARS</span>
            </div>
            <div className="space-y-2">
              {kot.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 text-xs py-1 ${
                    item.isAmendment ? 'bg-amber-100 p-1 border-l-2 border-amber-600 font-bold' : ''
                  }`}
                >
                  <span className="col-span-3 text-center font-black text-sm text-zinc-900">
                    {item.quantity}x
                  </span>
                  <div className="col-span-9">
                    <p className="font-black text-xs uppercase leading-snug">{item.itemName}</p>
                    {item.instructions && (
                      <p className="text-[10px] text-zinc-700 font-sans italic font-semibold mt-0.5 pl-1.5 border-l border-zinc-500">
                        ↳ Instructions: {item.instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-zinc-600">
            <p className="font-bold uppercase tracking-wider">STATUS: {kot.status}</p>
            <p className="mt-0.5">Please prepare and serve hot</p>
          </div>
        </div>
      </div>
    </div>
  );
};
