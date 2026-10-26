import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  ShoppingCart,
  Sliders,
  Trash,
  History,
  CheckCircle2,
  XCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryItem, StockMovement, Supplier } from '../types';
import { apiRequest, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const InventoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error, warning } = useToast();

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'MOVEMENTS'>('ITEMS');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [wastageItem, setWastageItem] = useState<InventoryItem | null>(null);

  // Add Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('Grains');
  const [newItemQty, setNewItemQty] = useState<number>(10);
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMin, setNewItemMin] = useState<number>(5);
  const [newItemReorder, setNewItemReorder] = useState<number>(15);
  const [newItemCost, setNewItemCost] = useState<number>(100);
  const [newItemLoc, setNewItemLoc] = useState('');
  const [newItemSupplier, setNewItemSupplier] = useState('');

  // Purchase Form
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  // Adjust Form
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Wastage Form
  const [wasteQty, setWasteQty] = useState<number>(1);
  const [wasteReason, setWasteReason] = useState('');
  const [isDamage, setIsDamage] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [itemsRes, movesRes, supRes] = await Promise.all([
        apiRequest<InventoryItem[]>('/inventory'),
        apiRequest<{ movements: StockMovement[] }>('/inventory/movements?limit=100'),
        apiRequest<Supplier[]>('/inventory/suppliers'),
      ]);
      setItems(itemsRes);
      setMovements(movesRes.movements);
      setSuppliers(supRes);
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || item.stockStatus === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Metrics
  const totalItemsCount = items.length;
  const inStockCount = items.filter((i) => i.stockStatus === 'IN_STOCK').length;
  const lowStockCount = items.filter((i) => i.stockStatus === 'LOW_STOCK').length;
  const outOfStockCount = items.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length;
  const totalInventoryValue = items.reduce((sum, i) => sum + i.currentQuantity * i.unitCost, 0);

  // Categories list
  const categoriesList = Array.from(new Set(items.map((i) => i.category)));

  // Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      await apiRequest('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCat.trim(),
          currentQuantity: Number(newItemQty),
          unit: newItemUnit.trim(),
          minThreshold: Number(newItemMin),
          reorderQuantity: Number(newItemReorder),
          unitCost: Number(newItemCost),
          storageLocation: newItemLoc.trim() || undefined,
          supplierId: newItemSupplier || undefined,
        }),
      });

      success(`Inventory item "${newItemName}" added successfully.`);
      setIsAddingItem(false);
      fetchInventory();
    } catch (err: any) {
      error(err.message || 'Failed to add inventory item');
    }
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseItem || purchaseQty <= 0) return;

    try {
      await apiRequest(`/inventory/${purchaseItem.id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(purchaseQty),
          unitCost: Number(purchaseCost),
          invoiceNumber: purchaseInvoice.trim() || undefined,
          supplierId: purchaseSupplier || undefined,
        }),
      });

      success(`Recorded purchase of +${purchaseQty} ${purchaseItem.unit} for ${purchaseItem.name}`);
      setPurchaseItem(null);
      fetchInventory();
    } catch (err: any) {
      error(err.message || 'Failed to record purchase');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    if (!adjustReason.trim()) {
      warning('A specific reason is required for manual stock adjustments.');
      return;
    }

    try {
      await apiRequest(`/inventory/${adjustItem.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          newQuantity: Number(adjustNewQty),
          reason: adjustReason.trim(),
        }),
      });

      success(`Stock for ${adjustItem.name} adjusted to ${adjustNewQty} ${adjustItem.unit}`);
      setAdjustItem(null);
      fetchInventory();
    } catch (err: any) {
      error(err.message || 'Failed to adjust stock');
    }
  };

  const handleRecordWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageItem || wasteQty <= 0) return;
    if (!wasteReason.trim()) {
      warning('An explanation is required to record wastage.');
      return;
    }

    try {
      await apiRequest(`/inventory/${wastageItem.id}/wastage`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(wasteQty),
          reason: wasteReason.trim(),
          isDamage,
        }),
      });

      success(`Recorded ${isDamage ? 'damage' : 'wastage'} of ${wasteQty} ${wastageItem.unit} for ${wastageItem.name}`);
      setWastageItem(null);
      fetchInventory();
    } catch (err: any) {
      error(err.message || 'Failed to record wastage');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-600" />
            <span>Stock & Inventory Management</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Track ingredients, automated recipe deductions, low-stock alerts, purchases, and wastage.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tabs */}
          <div className="flex bg-zinc-200/70 p-1 rounded-bento-sm text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'ITEMS' ? 'bg-white text-primary-text shadow-sm' : 'text-zinc-600'
              }`}
            >
              Stock Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'MOVEMENTS' ? 'bg-white text-primary-text shadow-sm' : 'text-zinc-600'
              }`}
            >
              Movement Ledger
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setNewItemName('');
                setNewItemQty(10);
                setNewItemCost(100);
                setIsAddingItem(true);
              }}
              className="px-3.5 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ingredient</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Grid Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-secondary-text uppercase">Total Stock Items</span>
          <p className="text-2xl font-extrabold text-primary-text mt-1">{totalItemsCount}</p>
          <span className="text-[10px] text-zinc-400">Tracked in recipes</span>
        </div>

        <div className="bento-card p-4">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">In Stock (Healthy)</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{inStockCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Above thresholds</span>
        </div>

        <div className={`bento-card p-4 ${lowStockCount > 0 ? 'border-amber-300 bg-amber-50/40' : ''}`}>
          <span className="text-[11px] font-bold text-amber-800 uppercase">Low Stock Alerts</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-amber-800 font-semibold">Below min threshold</span>
        </div>

        <div className={`bento-card p-4 ${outOfStockCount > 0 ? 'border-red-300 bg-red-50/40' : ''}`}>
          <span className="text-[11px] font-bold text-red-700 uppercase">Out of Stock</span>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{outOfStockCount}</p>
          <span className="text-[10px] text-red-600 font-medium">Zero quantity</span>
        </div>

        <div className="bento-card p-4 col-span-2 md:col-span-1 bg-gradient-to-br from-white to-zinc-50">
          <span className="text-[11px] font-bold text-secondary-text uppercase">Est. Stock Value</span>
          <p className="text-2xl font-extrabold text-primary-text mt-1">{formatINR(totalInventoryValue)}</p>
          <span className="text-[10px] text-zinc-400">Based on unit costs</span>
        </div>
      </div>

      {activeTab === 'ITEMS' ? (
        <>
          {/* Filters Bar */}
          <div className="bento-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-secondary-text absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ingredient by name..."
                  className="w-full pl-9 pr-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_STOCK">In Stock (Healthy)</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
                  <tr>
                    <th className="py-3 px-5">Ingredient / Supply</th>
                    <th className="py-3 px-5">Category</th>
                    <th className="py-3 px-5 text-center">Current Stock</th>
                    <th className="py-3 px-5 text-center">Reserved</th>
                    <th className="py-3 px-5 text-center">Min Threshold</th>
                    <th className="py-3 px-5 text-right">Unit Cost</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Supplier</th>
                    <th className="py-3 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-primary-text block">{item.name}</span>
                        {item.storageLocation && (
                          <span className="text-[11px] text-zinc-400">Loc: {item.storageLocation}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-xs text-secondary-text">{item.category}</td>

                      <td className="py-3.5 px-5 text-center font-extrabold text-primary-text">
                        {item.currentQuantity} <span className="text-xs font-normal text-zinc-500">{item.unit}</span>
                      </td>

                      <td className="py-3.5 px-5 text-center text-xs font-medium text-amber-700">
                        {item.reservedQuantity ? `${item.reservedQuantity} ${item.unit}` : '—'}
                      </td>

                      <td className="py-3.5 px-5 text-center text-xs text-zinc-500">
                        {item.minThreshold} {item.unit}
                      </td>

                      <td className="py-3.5 px-5 text-right font-medium text-zinc-800">
                        {formatINR(item.unitCost)}
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            item.stockStatus === 'IN_STOCK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.stockStatus === 'LOW_STOCK'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-rose-100 text-rose-800 font-black'
                          }`}
                        >
                          {item.stockStatus.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-secondary-text">
                        {item.supplier?.name || 'Local Market'}
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Record Purchase */}
                          <button
                            type="button"
                            onClick={() => {
                              setPurchaseItem(item);
                              setPurchaseQty(item.reorderQuantity || 10);
                              setPurchaseCost(item.unitCost);
                              setPurchaseSupplier(item.supplierId || '');
                            }}
                            title="Record Purchase (Add Stock)"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-bento-sm transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>

                          {/* Manual Adjust */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustNewQty(item.currentQuantity);
                              setAdjustReason('');
                            }}
                            title="Adjust Stock (Audit Recorded)"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-bento-sm transition-colors"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Record Wastage */}
                          <button
                            type="button"
                            onClick={() => {
                              setWastageItem(item);
                              setWasteQty(1);
                              setWasteReason('');
                              setIsDamage(false);
                            }}
                            title="Record Wastage / Damage"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-bento-sm transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredItems.length === 0 && (
              <div className="p-12 text-center text-zinc-400">
                <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-zinc-600">No matching inventory items found.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ===================== STOCK MOVEMENT LEDGER ===================== */
        <div className="bento-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary-text">Stock Movement History</h3>
            <span className="text-xs text-secondary-text">
              Complete audit ledger of purchases, order usages, and adjustments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-border text-xs font-bold text-secondary-text uppercase">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Ingredient</th>
                  <th className="py-3 px-5">Movement Type</th>
                  <th className="py-3 px-5 text-center">Change</th>
                  <th className="py-3 px-5 text-center">Before → After</th>
                  <th className="py-3 px-5">Reason / Reference</th>
                  <th className="py-3 px-5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-5 text-xs text-secondary-text">
                      {new Date(m.createdAt).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-5 font-semibold text-primary-text">
                      {m.inventoryItem?.name}
                    </td>

                    <td className="py-3 px-5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === 'PURCHASE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'USAGE_ORDER'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'MANUAL_ADJUSTMENT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-center font-mono font-bold text-xs">
                      <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}{' '}
                        {m.inventoryItem?.unit}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-center text-xs font-mono text-zinc-500">
                      {m.previousQuantity} → {m.newQuantity} {m.inventoryItem?.unit}
                    </td>

                    <td className="py-3 px-5 text-xs text-zinc-700">
                      {m.reason || (m.referenceId ? `Ref: ${m.referenceId}` : '—')}
                    </td>

                    <td className="py-3 px-5 text-xs text-secondary-text">
                      {m.performedBy?.name || 'System Auto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== ADD ITEM MODAL ===================== */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-lg w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-base text-primary-text">Add Inventory Item</h3>
              <button onClick={() => setIsAddingItem(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Ingredient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Cooking Oil"
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    placeholder="e.g. Dairy, Spices, Grains"
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Unit of Measurement *
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="litre">litre (Litre)</option>
                    <option value="ml">ml (Millilitre)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItemMin}
                    onChange={(e) => setNewItemMin(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItemReorder}
                    onChange={(e) => setNewItemReorder(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={newItemLoc}
                    onChange={(e) => setNewItemLoc(e.target.value)}
                    placeholder="e.g. Cold Room 1"
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Preferred Supplier
                  </label>
                  <select
                    value={newItemSupplier}
                    onChange={(e) => setNewItemSupplier(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white"
                  >
                    <option value="">None / Open Market</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-4 py-2 border border-border rounded-bento-sm text-xs font-semibold text-secondary-text hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== RECORD PURCHASE MODAL ===================== */}
      {purchaseItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-primary-text">Record Incoming Stock Purchase</h3>
                <p className="text-xs text-secondary-text">
                  Item: <strong className="text-primary-text">{purchaseItem.name}</strong>
                </p>
              </div>
              <button onClick={() => setPurchaseItem(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Quantity Purchased ({purchaseItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-sm font-bold text-primary-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Supplier Invoice / Bill #
                </label>
                <input
                  type="text"
                  value={purchaseInvoice}
                  onChange={(e) => setPurchaseInvoice(e.target.value)}
                  placeholder="e.g. INV-98442"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-bento-sm text-xs text-emerald-900 flex justify-between font-medium">
                <span>New Stock Level After Purchase:</span>
                <span className="font-bold">
                  {purchaseItem.currentQuantity + Number(purchaseQty)} {purchaseItem.unit}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPurchaseItem(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-secondary-text hover:bg-zinc-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 shadow"
                >
                  Confirm & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ADJUST STOCK MODAL ===================== */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-primary-text">Manual Stock Adjustment</h3>
                <p className="text-xs text-secondary-text">
                  Item: <strong className="text-primary-text">{adjustItem.name}</strong> (Current: {adjustItem.currentQuantity} {adjustItem.unit})
                </p>
              </div>
              <button onClick={() => setAdjustItem(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  New Authoritative Quantity ({adjustItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-sm font-bold text-primary-text"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Reason for Adjustment (Mandatory for Audit Trail) *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy / Spill / Calibration"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-secondary-text hover:bg-zinc-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adjustReason.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 shadow disabled:opacity-50"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== WASTAGE MODAL ===================== */}
      {wastageItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-primary-text">Record Wastage / Damaged Goods</h3>
                <p className="text-xs text-secondary-text">
                  Item: <strong className="text-primary-text">{wastageItem.name}</strong>
                </p>
              </div>
              <button onClick={() => setWastageItem(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleRecordWastage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Wastage Quantity ({wastageItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={wastageItem.currentQuantity}
                  required
                  value={wasteQty}
                  onChange={(e) => setWasteQty(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-sm font-bold text-red-600"
                />
              </div>

              <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDamage}
                  onChange={(e) => setIsDamage(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Classify specifically as transit / kitchen damage</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Detailed Explanation (Mandatory) *
                </label>
                <input
                  type="text"
                  required
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  placeholder="e.g. Expired batch / Burned during prep / Storage cooler leak"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setWastageItem(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-secondary-text hover:bg-zinc-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!wasteReason.trim()}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 shadow disabled:opacity-50"
                >
                  Record Loss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
