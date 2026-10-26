export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  description?: string | null;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  description?: string | null;
  sellingPrice: number;
  isAvailable: boolean;
  imageUrl?: string | null;
  preparationNotes?: string | null;
  category?: MenuCategory;
  recipe?: {
    id: string;
    notes?: string;
    ingredients: {
      id: string;
      inventoryItemId: string;
      quantityRequired: number;
      unit: string;
      inventoryItem?: {
        name: string;
        unit: string;
        currentQuantity: number;
      };
    }[];
  };
}

export interface OrderItem {
  id?: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string | null;
  status: 'DRAFT' | 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  orderNotes?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  createdById?: string | null;
  createdBy?: { id: string; name: string; username: string };
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  kots?: KOT[];
  bill?: CustomerBill | null;
}

export interface KOTItem {
  id: string;
  kotId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  instructions?: string | null;
  isAmendment: boolean;
  isCancelled: boolean;
}

export interface KOT {
  id: string;
  kotNumber: string;
  orderId: string;
  version: number;
  status: 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  orderType: string;
  tableNumber?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string; username: string };
  createdAt: string;
  items: KOTItem[];
  order?: {
    id: string;
    orderNumber: string;
    orderType: string;
    tableNumber?: string | null;
    status: string;
    bill?: { id: string; billNumber: string; paymentStatus: string };
  };
}

export interface BillItem {
  id: string;
  billId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'OTHER';
  referenceNumber?: string | null;
  notes?: string | null;
  receivedById?: string | null;
  receivedBy?: { id: string; name: string };
  createdAt: string;
}

export interface CustomerBill {
  id: string;
  billNumber: string;
  orderId: string;
  billDate: string;
  subtotal: number;
  discount: number;
  discountReason?: string | null;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  grandTotal: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  finalizedById?: string | null;
  finalizedBy?: { id: string; name: string; username: string };
  createdAt: string;
  items: BillItem[];
  payments: Payment[];
  order?: {
    id: string;
    orderNumber: string;
    orderType: string;
    tableNumber?: string | null;
    status: string;
    kots?: { id: string; kotNumber: string; status: string }[];
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  reservedQuantity?: number;
  effectiveQuantity?: number;
  unit: string;
  minThreshold: number;
  reorderQuantity: number;
  unitCost: number;
  storageLocation?: string | null;
  supplierId?: string | null;
  supplier?: { id: string; name: string; phone?: string; email?: string } | null;
  lastPurchaseDate?: string | null;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  inventoryItem?: { id: string; name: string; unit: string; category: string };
  type: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  referenceId?: string | null;
  performedById?: string | null;
  performedBy?: { id: string; name: string; username: string };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  action: string;
  entityType: string;
  entityId: string;
  performedById?: string | null;
  performedBy?: { id: string; name: string; username: string; role: string };
  reason?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface RestaurantSettings {
  id: string;
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  fssaiNumber: string;
  defaultTaxRate: number;
  defaultServiceCharge: number;
  currencySymbol: string;
  receiptHeaderMessage: string;
  receiptFooterMessage: string;
  allowNegativeStock: boolean;
}
