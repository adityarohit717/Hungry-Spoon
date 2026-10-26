import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Save,
  UtensilsCrossed,
  ChefHat,
  AlertCircle,
  X,
  FileEdit,
} from 'lucide-react';
import { MenuCategory, MenuItem } from '../types';
import { apiRequest, formatINR } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export const POSPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Order Details
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Item instruction modal
  const [editingItemNotes, setEditingItemNotes] = useState<CartItem | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  // Stock Override Warning Modal
  const [stockShortages, setStockShortages] = useState<any[] | null>(null);

  const fetchMenu = async () => {
    try {
      const res = await apiRequest<MenuCategory[]>('/menu');
      setCategories(res);
    } catch (e: any) {
      error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Filter items
  const allItems: MenuItem[] = categories.flatMap((cat) => cat.items || []);
  const filteredItems = allItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) {
      warning(`"${item.name}" is currently marked unavailable.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.sellingPrice,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.menuItemId === menuItemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menuItemId !== menuItemId));
  };

  const openItemNotes = (item: CartItem) => {
    setEditingItemNotes(item);
    setTempNotes(item.notes);
  };

  const saveItemNotes = () => {
    if (!editingItemNotes) return;
    setCart((prev) =>
      prev.map((ci) =>
        ci.menuItemId === editingItemNotes.menuItemId ? { ...ci, notes: tempNotes } : ci
      )
    );
    setEditingItemNotes(null);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const estimatedTax = Math.round(subtotal * 0.05 * 100) / 100;
  const estimatedTotal = subtotal + estimatedTax;

  const handleCreateOrder = async (sendToKitchen: boolean, allowOverride: boolean = false) => {
    if (cart.length === 0) {
      warning('Cart is empty. Please add items to create an order.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderType,
        tableNumber: tableNumber.trim() || (orderType === 'DINE_IN' ? 'Unassigned' : orderType),
        orderNotes: orderNotes.trim(),
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          notes: c.notes,
        })),
        sendToKitchenDirectly: sendToKitchen,
        allowStockOverride: allowOverride,
      };

      const res = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      success(
        sendToKitchen
          ? `Order #${res.orderNumber} dispatched to kitchen! KOT generated.`
          : `Order #${res.orderNumber} saved as Draft.`
      );

      // Reset form
      setCart([]);
      setTableNumber('');
      setOrderNotes('');
      setStockShortages(null);

      if (sendToKitchen) {
        navigate('/kds');
      }
    } catch (err: any) {
      if (err.status === 409 && err.data?.requiresOverride) {
        // Show stock shortage warning modal
        setStockShortages(err.data.shortages);
      } else {
        error(err.message || 'Failed to place order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Menu & Categories (65%) */}
      <div className="flex-1 flex flex-col border-r border-border bg-[#F7F7F4] overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-4 bg-white border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-secondary-text absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu dishes, beverages, curries..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-border rounded-bento-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              All Items ({allItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {cat.name} ({cat.items?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const inCart = cart.find((ci) => ci.menuItemId === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`bento-card p-4 flex flex-col justify-between cursor-pointer select-none transition-all ${
                    !item.isAvailable
                      ? 'opacity-60 bg-zinc-100 cursor-not-allowed'
                      : inCart
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20'
                      : 'hover:border-zinc-300'
                  }`}
                >
                  {/* Image & Badges */}
                  <div>
                    {item.imageUrl && (
                      <div className="w-full h-28 rounded-lg overflow-hidden mb-2.5 bg-zinc-100 relative">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white text-[11px] font-bold">
                            UNAVAILABLE
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-sm text-primary-text leading-tight">{item.name}</h4>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-secondary-text mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Add */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-100">
                    <span className="font-extrabold text-sm text-primary-text">
                      {formatINR(item.sellingPrice)}
                    </span>

                    {inCart ? (
                      <span className="px-2 py-0.5 rounded-full bg-brand-600 text-white text-xs font-bold shadow-sm">
                        {inCart.quantity} in cart
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!item.isAvailable}
                        className="p-1 rounded-md bg-zinc-100 hover:bg-brand-50 text-zinc-700 hover:text-brand-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <UtensilsCrossed className="w-10 h-10 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-500">No dishes match your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart & Order Submission Panel (35%) */}
      <div className="w-96 md:w-[420px] bg-white flex flex-col h-full border-l border-border shadow-sm">
        {/* Order Info Header */}
        <div className="p-4 border-b border-border space-y-3 bg-zinc-50/50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-primary-text flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-brand-600" />
              <span>Current Order Cart</span>
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Order Type Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-200/70 rounded-bento-sm text-xs font-semibold">
            {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-md transition-colors capitalize ${
                  orderType === type
                    ? 'bg-white text-primary-text shadow-sm'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                {type.replace('_', '-').toLowerCase()}
              </button>
            ))}
          </div>

          {/* Table / Reference input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={orderType === 'DINE_IN' ? 'Table Number (e.g. Table 4)' : 'Customer / Order Ref'}
              className="w-full px-3 py-1.5 bg-white border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
              <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-zinc-400 mt-1">Tap dishes on the left to add to order</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="p-3 bg-zinc-50 rounded-bento-sm border border-border space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-xs text-primary-text leading-snug">{item.name}</p>
                    <span className="text-[11px] text-secondary-text">
                      {formatINR(item.price)} each
                    </span>
                  </div>

                  <span className="font-bold text-xs text-primary-text">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </div>

                {/* Instructions / Notes pill */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => openItemNotes(item)}
                    className="flex items-center space-x-1 text-[11px] text-zinc-500 hover:text-brand-600"
                  >
                    <FileEdit className="w-3 h-3" />
                    <span>{item.notes ? `Note: "${item.notes}"` : '+ Special Instructions'}</span>
                  </button>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-6 h-6 rounded bg-white border border-border flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-6 h-6 rounded bg-white border border-border flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="p-1 text-zinc-400 hover:text-red-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Notes & Bottom Action Panel */}
        <div className="p-4 border-t border-border bg-zinc-50/50 space-y-3">
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Order-level notes (e.g. Birthday, Hurry, Less oil)..."
            className="w-full px-3 py-1.5 bg-white border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />

          {/* Pricing summary */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-secondary-text">
              <span>Items Subtotal:</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-secondary-text">
              <span>Estimated GST (5%):</span>
              <span>{formatINR(estimatedTax)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-primary-text pt-1 border-t border-border">
              <span>Estimated Total:</span>
              <span className="text-brand-600">{formatINR(estimatedTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => handleCreateOrder(false)}
              className="w-full py-2.5 px-3 bg-white border border-border text-zinc-700 rounded-bento-sm font-semibold text-xs hover:bg-zinc-100 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => handleCreateOrder(true)}
              className="w-full py-2.5 px-3 bg-brand-600 text-white rounded-bento-sm font-semibold text-xs hover:bg-brand-700 transition-colors shadow flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <ChefHat className="w-4 h-4" />
              <span>Send to Kitchen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Item Instructions Modal */}
      {editingItemNotes && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-sm w-full p-5 border border-border shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-primary-text">
                Instructions for {editingItemNotes.name}
              </h4>
              <button onClick={() => setEditingItemNotes(null)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="e.g. Less spicy, Extra raita, No coriander"
              className="w-full px-3 py-2 text-xs border border-border rounded-bento-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingItemNotes(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveItemNotes}
                className="px-3.5 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-md hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Shortage Warning / Override Modal */}
      {stockShortages && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-md w-full p-6 border border-amber-300 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base text-primary-text">Low Ingredient Inventory Warning</h3>
                <p className="text-xs text-secondary-text">
                  The recipe requirements for this order exceed currently unreserved stock.
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-amber-50/50 rounded-bento-sm border border-amber-200 text-xs">
              {stockShortages.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-amber-200/50 last:border-0">
                  <span className="font-semibold text-amber-950">{s.ingredientName}</span>
                  <span className="text-amber-800">
                    Available: <strong className="text-red-600">{s.available} {s.unit}</strong> (Needs {s.required} {s.unit})
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-secondary-text">
              Would you like to authorize an operational override and send this order to the kitchen anyway?
              This event will be logged in the system audit trail.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setStockShortages(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-bento-sm"
              >
                Adjust Order Items
              </button>
              <button
                type="button"
                onClick={() => handleCreateOrder(true, true)}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-bento-sm shadow"
              >
                Authorize & Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
