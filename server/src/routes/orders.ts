import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { generateOrderNumber, calculateBillingTotals } from '../services/billingService';
import { createKOTForOrder } from '../services/kotService';
import {
  checkStockAvailability,
  reserveStockForOrder,
  releaseStockReservations,
} from '../services/inventoryService';

const router = Router();

// GET /api/orders
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, orderType, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (orderType && orderType !== 'ALL') {
      where.orderType = orderType;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: String(search) } },
        { tableNumber: { contains: String(search) } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          kots: {
            include: { items: true },
          },
          bill: {
            include: { payments: true },
          },
          createdBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        kots: {
          include: { items: true },
          orderBy: { version: 'asc' },
        },
        bill: {
          include: { items: true, payments: true },
        },
        reservations: {
          include: { inventoryItem: true },
        },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

// POST /api/orders - Create a new order
router.post('/', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      orderType,
      tableNumber,
      orderNotes,
      items,
      sendToKitchenDirectly,
      allowStockOverride,
      customOrderNumber,
      customKOTNumber,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item.' });
      return;
    }

    // Verify items and fetch authoritative prices from DB
    const validatedItems: {
      menuItemId: string;
      itemName: string;
      unitPrice: number;
      quantity: number;
      notes?: string;
    }[] = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem) {
        res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
        return;
      }
      if (!menuItem.isAvailable) {
        res.status(400).json({ error: `"${menuItem.name}" is currently unavailable.` });
        return;
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for item ${menuItem.name}` });
        return;
      }

      validatedItems.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        unitPrice: menuItem.sellingPrice,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    // Check stock if sending to kitchen directly
    if (sendToKitchenDirectly) {
      const stockCheck = await checkStockAvailability(validatedItems);
      if (!stockCheck.sufficient && !allowStockOverride) {
        res.status(409).json({
          error: 'Insufficient inventory for some ingredients.',
          requiresOverride: true,
          shortages: stockCheck.shortages,
        });
        return;
      }
    }

    // Fetch default restaurant settings for tax calculations
    const settings = await prisma.restaurantSettings.findFirst();
    const defaultTaxRate = settings?.defaultTaxRate ?? 5.0;

    const totals = calculateBillingTotals(validatedItems, 0, defaultTaxRate, 0);

    // Support custom order number / name if user specified one
    let orderNumber: string;
    if (customOrderNumber && String(customOrderNumber).trim()) {
      const candidate = String(customOrderNumber).trim();
      const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
      if (existing) {
        orderNumber = `${candidate}-${Date.now().toString().slice(-4)}`;
      } else {
        orderNumber = candidate;
      }
    } else {
      orderNumber = await generateOrderNumber();
    }

    const initialStatus = sendToKitchenDirectly ? 'SENT_TO_KITCHEN' : 'DRAFT';

    // Execute order creation in transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          orderType: orderType || 'DINE_IN',
          tableNumber: tableNumber?.trim() || null,
          status: initialStatus,
          orderNotes: orderNotes?.trim() || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.taxAmount,
          grandTotal: totals.grandTotal,
          createdById: req.user!.id,
          items: {
            create: validatedItems.map((vi) => ({
              menuItemId: vi.menuItemId,
              itemName: vi.itemName,
              unitPrice: vi.unitPrice,
              quantity: vi.quantity,
              notes: vi.notes,
              status: sendToKitchenDirectly ? 'COOKING' : 'PENDING',
            })),
          },
        },
        include: { items: true },
      });

      if (sendToKitchenDirectly) {
        // Generate KOT with custom name if specified
        const kotNum = customKOTNumber?.trim() || (customOrderNumber?.trim() ? `KOT-${customOrderNumber.trim()}` : undefined);
        await createKOTForOrder(order.id, req.user!.id, false, undefined, tx, kotNum);
        // Reserve stock
        await reserveStockForOrder(order.id, tx);
      }

      return order;
    });

    await createAuditLog({
      eventType: 'ORDER_CREATED',
      action: `Created Order #${createdOrder.orderNumber} (${createdOrder.orderType})`,
      entityType: 'Order',
      entityId: createdOrder.id,
      performedById: req.user!.id,
      details: {
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        itemCount: validatedItems.length,
        grandTotal: totals.grandTotal,
      },
    });

    res.status(201).json(createdOrder);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order.' });
  }
});

// PUT /api/orders/:id - Edit an order before final billing
router.put('/:id', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { orderType, tableNumber, orderNotes, items } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        bill: true,
        kots: true,
      },
    });

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // STRICT RULE: Once customer bill is finalized, staff CANNOT modify items
    if (existingOrder.bill) {
      res.status(403).json({
        error: 'Order has already been finalized with a Customer Bill. Changes are strictly forbidden.',
      });
      return;
    }

    if (existingOrder.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot modify a cancelled order.' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item.' });
      return;
    }

    // Validate items and fetch prices
    const validatedItems: {
      menuItemId: string;
      itemName: string;
      unitPrice: number;
      quantity: number;
      notes?: string;
    }[] = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem) {
        res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
        return;
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for item ${menuItem.name}` });
        return;
      }

      validatedItems.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        unitPrice: menuItem.sellingPrice,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    const settings = await prisma.restaurantSettings.findFirst();
    const defaultTaxRate = settings?.defaultTaxRate ?? 5.0;
    const totals = calculateBillingTotals(validatedItems, existingOrder.discount, defaultTaxRate, 0);

    const wasSentToKitchen = existingOrder.kots.length > 0;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If was sent to kitchen, calculate amendment differences
      let newOrModifiedItems: any[] = [];
      if (wasSentToKitchen) {
        for (const newItem of validatedItems) {
          const oldItem = existingOrder.items.find((oi) => oi.menuItemId === newItem.menuItemId);
          if (!oldItem) {
            // Newly added item
            newOrModifiedItems.push({
              menuItemId: newItem.menuItemId,
              itemName: newItem.itemName,
              quantity: newItem.quantity,
              instructions: `[ADDED] ${newItem.notes || ''}`.trim(),
              isAmendment: true,
            });
          } else if (newItem.quantity > oldItem.quantity) {
            // Increased quantity
            newOrModifiedItems.push({
              menuItemId: newItem.menuItemId,
              itemName: newItem.itemName,
              quantity: newItem.quantity - oldItem.quantity,
              instructions: `[QTY INCREASE +${newItem.quantity - oldItem.quantity}] ${newItem.notes || ''}`.trim(),
              isAmendment: true,
            });
          }
        }
      }

      // Replace items
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      const order = await tx.order.update({
        where: { id },
        data: {
          orderType: orderType || existingOrder.orderType,
          tableNumber: tableNumber !== undefined ? tableNumber?.trim() : existingOrder.tableNumber,
          orderNotes: orderNotes !== undefined ? orderNotes?.trim() : existingOrder.orderNotes,
          subtotal: totals.subtotal,
          tax: totals.taxAmount,
          grandTotal: totals.grandTotal,
          items: {
            create: validatedItems.map((vi) => ({
              menuItemId: vi.menuItemId,
              itemName: vi.itemName,
              unitPrice: vi.unitPrice,
              quantity: vi.quantity,
              notes: vi.notes,
              status: wasSentToKitchen ? 'COOKING' : 'PENDING',
            })),
          },
        },
        include: { items: true },
      });

      // If already sent to kitchen and items changed, issue amendment KOT!
      if (wasSentToKitchen && newOrModifiedItems.length > 0) {
        await createKOTForOrder(order.id, req.user!.id, true, newOrModifiedItems, tx);
        // Refresh stock reservations
        await releaseStockReservations(order.id, req.user!.id, tx);
        await reserveStockForOrder(order.id, tx);
      }

      return order;
    });

    await createAuditLog({
      eventType: 'ORDER_UPDATED',
      action: `Updated Order #${updatedOrder.orderNumber}`,
      entityType: 'Order',
      entityId: updatedOrder.id,
      performedById: req.user!.id,
      details: {
        wasSentToKitchen,
        newGrandTotal: totals.grandTotal,
      },
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message || 'Failed to update order.' });
  }
});

// POST /api/orders/:id/send-kitchen - Send draft order to kitchen
router.post('/:id/send-kitchen', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { allowStockOverride, customKOTNumber } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, kots: true, bill: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.bill) {
      res.status(400).json({ error: 'Order already finalized with bill.' });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot send cancelled order to kitchen.' });
      return;
    }

    // Check stock
    const stockCheck = await checkStockAvailability(order.items);
    if (!stockCheck.sufficient && !allowStockOverride) {
      res.status(409).json({
        error: 'Insufficient ingredient inventory.',
        requiresOverride: true,
        shortages: stockCheck.shortages,
      });
      return;
    }

    const kot = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'SENT_TO_KITCHEN' },
      });

      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { status: 'COOKING' },
      });

      const kotNum = customKOTNumber?.trim() || undefined;
      const newKot = await createKOTForOrder(order.id, req.user!.id, false, undefined, tx, kotNum);
      await reserveStockForOrder(order.id, tx);
      return newKot;
    });

    await createAuditLog({
      eventType: 'KOT_GENERATED',
      action: `Dispatched KOT #${kot?.kotNumber} for Order #${order.orderNumber} to kitchen`,
      entityType: 'KOT',
      entityId: kot!.id,
      performedById: req.user!.id,
    });

    res.json({ message: 'Order dispatched to kitchen.', kot });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispatch order to kitchen.' });
  }
});

// POST /api/orders/:id/cancel - Cancel order & release reservations
router.post('/:id/cancel', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { bill: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // If bill exists and is paid, staff cannot cancel without admin role
    if (order.bill && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Only administrators can cancel an order with an existing customer bill.',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });

      await tx.kOT.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });

      // Release reserved stock!
      await releaseStockReservations(id, req.user!.id, tx);
    });

    await createAuditLog({
      eventType: 'ORDER_CANCELLED',
      action: `Cancelled Order #${order.orderNumber}`,
      entityType: 'Order',
      entityId: order.id,
      performedById: req.user!.id,
      reason: reason || 'Cancelled by user',
    });

    res.json({ message: 'Order successfully cancelled and stock reservations released.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel order.' });
  }
});

export default router;
