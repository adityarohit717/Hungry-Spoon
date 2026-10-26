import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  entityNumber: string;
  relatedInfo?: string;
  isBillDeletion?: boolean;
  onConfirm: (reason: string, deleteAssociatedKOTs?: boolean) => Promise<void>;
  onClose: () => void;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  entityNumber,
  relatedInfo,
  isBillDeletion = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [deleteAssociatedKOTs, setDeleteAssociatedKOTs] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await onConfirm(reason, deleteAssociatedKOTs);
      onClose();
    } catch (e) {
      // handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-bento max-w-lg w-full p-6 shadow-2xl border border-red-200">
        <div className="flex items-center space-x-3 text-red-600 pb-3 border-b border-border">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-primary-text">{title}</h3>
            <span className="text-xs text-red-600 font-semibold uppercase tracking-wider">
              Administrator Authorized Action Only
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-secondary-text leading-relaxed">{description}</p>

          <div className="p-3 bg-zinc-50 rounded-bento-sm border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-secondary-text">Target Identifier:</span>
              <span className="font-bold text-primary-text">{entityNumber}</span>
            </div>
            {relatedInfo && (
              <div className="flex justify-between">
                <span className="text-secondary-text">Related Details:</span>
                <span className="font-medium text-primary-text">{relatedInfo}</span>
              </div>
            )}
          </div>

          {isBillDeletion && (
            <div className="p-3 bg-amber-50 rounded-bento-sm border border-amber-200 text-xs space-y-2">
              <p className="font-bold text-amber-900">Deletion Scope Preference:</p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAssociatedKOTs}
                  onChange={(e) => setDeleteAssociatedKOTs(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-amber-800">
                  Also permanently delete associated Kitchen Order Tickets (KOTs) for this order.
                  (Default is to keep kitchen audit trail intact).
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-primary-text mb-1">
              Reason for Deletion / Correction (Required for Audit Log)
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Accidental double entry / Manager authorized void"
              className="w-full px-3 py-2 text-sm border border-border rounded-bento-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <label className="flex items-center space-x-2 pt-2 text-xs font-semibold text-red-700 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span>I confirm that this action is permanent and cannot be undone.</span>
          </label>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-border rounded-bento-sm text-sm font-medium text-secondary-text hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed || !reason.trim() || submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-bento-sm text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow"
            >
              <Trash2 className="w-4 h-4" />
              <span>{submitting ? 'Executing Deletion...' : 'Permanently Delete'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
