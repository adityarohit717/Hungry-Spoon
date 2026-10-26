import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  Sparkles,
  Layers,
  Utensils,
  PlusCircle,
  X,
  Boxes,
} from 'lucide-react';
import { MenuCategory, MenuItem, InventoryItem } from '../types';
import { apiRequest, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const MenuManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Item Form Fields
  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemPrepNotes, setItemPrepNotes] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<
    { inventoryItemId: string; quantityRequired: number; unit: string }[]
  >([]);

  // Category Form Fields
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, invRes] = await Promise.all([
        apiRequest<MenuCategory[]>('/menu'),
        apiRequest<InventoryItem[]>('/inventory'),
      ]);
      setCategories(menuRes);
      setInventoryItems(invRes);
      if (menuRes.length > 0 && !itemCatId) {
        setItemCatId(menuRes[0].id);
      }
    } catch (e) {
      console.error('Failed to load menu data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCatId(categories[0]?.id || '');
    setItemPrice(0);
    setItemDesc('');
    setItemImage('');
    setItemPrepNotes('');
    setRecipeIngredients([]);
    setIsCreatingItem(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCatId(item.categoryId);
    setItemPrice(item.sellingPrice);
    setItemDesc(item.description || '');
    setItemImage(item.imageUrl || '');
    setItemPrepNotes(item.preparationNotes || '');

    // Map existing recipe ingredients if present
    const existing = item.recipe?.ingredients?.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      quantityRequired: i.quantityRequired,
      unit: i.unit,
    })) || [];
    setRecipeIngredients(existing);

    setIsCreatingItem(true);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await apiRequest(`/menu/items/${item.id}/availability`, { method: 'PATCH' });
      success(`"${item.name}" availability updated`);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to toggle availability');
    }
  };

  const handleAddRecipeIngredient = () => {
    if (inventoryItems.length === 0) return;
    const defaultInv = inventoryItems[0];
    setRecipeIngredients((prev) => [
      ...prev,
      { inventoryItemId: defaultInv.id, quantityRequired: 0.1, unit: defaultInv.unit },
    ]);
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || itemPrice <= 0 || !itemCatId) {
      error('Please provide item name, category, and a valid selling price.');
      return;
    }

    try {
      const payload = {
        name: itemName.trim(),
        categoryId: itemCatId,
        sellingPrice: Number(itemPrice),
        description: itemDesc.trim() || null,
        imageUrl: itemImage.trim() || null,
        preparationNotes: itemPrepNotes.trim() || null,
        recipeIngredients: recipeIngredients.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: Number(r.quantityRequired),
          unit: r.unit,
        })),
      };

      if (editingItem) {
        await apiRequest(`/menu/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        success(`Menu item "${itemName}" updated successfully!`);
      } else {
        await apiRequest('/menu/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        success(`New menu item "${itemName}" added!`);
      }

      setIsCreatingItem(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to save menu item');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await apiRequest('/menu/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
        }),
      });

      success(`Category "${newCatName}" created!`);
      setNewCatName('');
      setNewCatDesc('');
      setIsCreatingCategory(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to create category');
    }
  };

  const allItems: MenuItem[] = categories.flatMap((c) => c.items || []);
  const filteredItems = allItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-text tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            <span>Menu & Recipe Management</span>
          </h1>
          <p className="text-sm text-secondary-text mt-1">
            Configure dishes, prices, availability, and ingredient recipes for automatic inventory tracking.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreatingCategory(true)}
              className="px-3.5 py-2 bg-white border border-border text-zinc-700 rounded-bento-sm text-xs font-semibold hover:bg-zinc-50 shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4 text-brand-600" />
              <span>Add Category</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Menu Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bento-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Category Pills */}
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

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-secondary-text absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bento-card p-5 flex flex-col justify-between border transition-all ${
              !item.isAvailable ? 'opacity-70 bg-zinc-50' : 'bg-white'
            }`}
          >
            <div>
              {item.imageUrl && (
                <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-zinc-100 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                      Unavailable
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-primary-text leading-tight">{item.name}</h3>
                  <span className="text-[11px] font-semibold text-secondary-text uppercase tracking-wider block mt-0.5">
                    {categories.find((c) => c.id === item.categoryId)?.name || 'General'}
                  </span>
                </div>
                <span className="font-extrabold text-base text-brand-600">
                  {formatINR(item.sellingPrice)}
                </span>
              </div>

              {item.description && (
                <p className="text-xs text-secondary-text mt-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Recipe mapping pill indicator */}
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-brand-600" />
                  <span>
                    Recipe Ingredients:{' '}
                    {item.recipe?.ingredients && item.recipe.ingredients.length > 0 ? (
                      <strong className="text-emerald-700">
                        {item.recipe.ingredients.length} items mapped
                      </strong>
                    ) : (
                      <strong className="text-amber-700">None linked</strong>
                    )}
                  </span>
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
              {/* Availability Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleAvailability(item)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  item.isAvailable
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {item.isAvailable ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>In Stock</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Marked Out</span>
                  </>
                )}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="flex items-center space-x-1 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-bento-sm text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===================== ADD / EDIT ITEM MODAL ===================== */}
      {isCreatingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-bento max-w-2xl w-full p-6 shadow-2xl border border-border space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-lg text-primary-text">
                {editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Create New Menu Item'}
              </h3>
              <button onClick={() => setIsCreatingItem(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Kadai Paneer Special"
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Category *
                  </label>
                  <select
                    value={itemCatId}
                    onChange={(e) => setItemCatId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs font-bold text-primary-text focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-text mb-1">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={itemImage}
                    onChange={(e) => setItemImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Ingredients, flavors, textures..."
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Recipe Ingredients Mapping */}
              <div className="p-4 bg-zinc-50 rounded-bento-sm border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-primary-text uppercase tracking-wide">
                      Inventory Recipe Ingredient Deductions
                    </h4>
                    <p className="text-[11px] text-secondary-text">
                      Ingredients will be automatically reserved and consumed when ordered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRecipeIngredient}
                    className="px-2.5 py-1 bg-white border border-border text-brand-600 rounded-md text-xs font-semibold hover:bg-zinc-100 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {recipeIngredients.map((r, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select
                        value={r.inventoryItemId}
                        onChange={(e) => {
                          const inv = inventoryItems.find((i) => i.id === e.target.value);
                          setRecipeIngredients((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    inventoryItemId: e.target.value,
                                    unit: inv?.unit || item.unit,
                                  }
                                : item
                            )
                          );
                        }}
                        className="flex-1 px-2.5 py-1 bg-white border border-border rounded text-xs"
                      >
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Unit: {inv.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={r.quantityRequired}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRecipeIngredients((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, quantityRequired: val } : item
                            )
                          );
                        }}
                        placeholder="Qty"
                        className="w-20 px-2 py-1 bg-white border border-border rounded text-xs text-center"
                      />

                      <span className="w-12 text-xs text-zinc-500 font-semibold">{r.unit}</span>

                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeIngredient(idx)}
                        className="p-1 text-zinc-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {recipeIngredients.length === 0 && (
                    <p className="text-xs text-zinc-400 italic">No recipe mapped yet.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="px-4 py-2 border border-border rounded-bento-sm text-xs font-semibold text-secondary-text hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-bento-sm text-xs font-semibold hover:bg-brand-700 shadow"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ADD CATEGORY MODAL ===================== */}
      {isCreatingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-bento max-w-sm w-full p-5 border border-border shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-primary-text">Add Menu Category</h3>
              <button onClick={() => setIsCreatingCategory(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Clay Oven Breads, Tandoori Starters"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-text mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="e.g. Freshly baked naans"
                  className="w-full px-3 py-1.5 border border-border rounded-bento-sm text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-md hover:bg-brand-700 shadow"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
