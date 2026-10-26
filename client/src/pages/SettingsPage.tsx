import React, { useState, useEffect } from 'react';
import { Settings, Save, Store, Receipt, ShieldCheck } from 'lucide-react';
import { RestaurantSettings } from '../types';
import { apiRequest } from '../lib/api';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest<RestaurantSettings>('/settings');
        setSettings(res);
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      success('Restaurant settings and invoice preferences saved successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8">
        <div className="h-8 bg-zinc-200 animate-pulse rounded w-48 mb-4" />
        <div className="h-64 bg-zinc-200 animate-pulse rounded-bento" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            <span>Restaurant Configuration & Billing Preferences</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Official business details, tax rates, GSTIN, and printed invoice headers.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand Details Card */}
        <div className="bento-card p-6 bg-white space-y-4">
          <h3 className="font-bold text-sm text-primary-text flex items-center gap-2 pb-2 border-b border-border">
            <Store className="w-4 h-4 text-brand-600" />
            <span>Store & Location Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Restaurant Brand Name
              </label>
              <input
                type="text"
                required
                value={settings.restaurantName}
                onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-bold text-primary-text"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Physical Restaurant Address (Printed on receipts)
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
              />
            </div>
          </div>
        </div>

        {/* Taxes & Legal Identifiers */}
        <div className="bento-card p-6 bg-white space-y-4">
          <h3 className="font-bold text-sm text-primary-text flex items-center gap-2 pb-2 border-b border-border">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Taxation & Statutory Identifiers</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                GSTIN (Goods & Services Tax Identification)
              </label>
              <input
                type="text"
                value={settings.gstNumber}
                onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                FSSAI Food License Number
              </label>
              <input
                type="text"
                value={settings.fssaiNumber}
                onChange={(e) => setSettings({ ...settings, fssaiNumber: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Default GST Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="28"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-bold"
              />
              <span className="text-[11px] text-zinc-400 mt-0.5 block">
                Standard restaurant GST in India is typically 5% (without ITC).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text mb-1">
                Default Service Charge (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={settings.defaultServiceCharge}
                onChange={(e) =>
                  setSettings({ ...settings, defaultServiceCharge: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Invoice Messages */}
        <div className="bento-card p-6 bg-white space-y-4">
          <h3 className="font-bold text-sm text-primary-text flex items-center gap-2 pb-2 border-b border-border">
            <Receipt className="w-4 h-4 text-brand-600" />
            <span>Printed Receipt Custom Messages</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Receipt Header Welcome Note
            </label>
            <input
              type="text"
              value={settings.receiptHeaderMessage}
              onChange={(e) => setSettings({ ...settings, receiptHeaderMessage: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Receipt Footer Closing Greeting
            </label>
            <input
              type="text"
              value={settings.receiptFooterMessage}
              onChange={(e) => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-bento-sm text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-bento-sm text-sm font-semibold hover:bg-brand-700 shadow transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
