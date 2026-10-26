import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// Helper to determine status
const getStockStatus = (current: number, minThreshold: number) => {
  if (current <= 0) return 'OUT_OF_STOCK';
  if (current <= minThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};

// GET /api/inventory - List stock items with alert status
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, search } = req.query;

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.name = { contains: String(search) };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        supplier: true,
        stockReservations: {
          where: { status: 'RESERVED' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enrichedItems = items.map((item) => {
      const reservedQuantity = item.stockReservations.reduce(
        (sum, r) => sum + r.quantityReserved,
        0
      );
      const effectiveQuantity = Math.max(0, item.currentQuantity - reservedQuantity);
      const stockStatus = getStockStatus(item.currentQuantity, item.minThreshold);

      return {
        ...item,
        reservedQuantity,
        effectiveQuantity,
        stockStatus,
      };
    });

    // Filter by status if specified
    const filtered = status && status !== 'ALL'
      ? enrichedItems.filter((i) => i.stockStatus === status)
      : enrichedItems;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve inventory items.' });
  }
});

// GET /api/inventory/low-stock - List only low stock and out of stock items
router.get('/low-stock', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: { supplier: true },
    });

    const lowStock = items
      .map((item) => ({
        ...item,
        stockStatus: getStockStatus(item.currentQuantity, item.minThreshold),
      }))
      .filter((item) => item.stockStatus === 'LOW_STOCK' || item.stockStatus === 'OUT_OF_STOCK')
      .sort((a, b) => (a.currentQuantity / a.minThreshold) - (b.currentQuantity / b.minThreshold));

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve low-stock items.' });
  }
});

// GET /api/inventory/movements - Stock movement history
router.get('/movements', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, type, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (itemId) where.inventoryItemId = itemId;
    if (type && type !== 'ALL') where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true, category: true } },
          performedBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ movements, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stock movements.' });
  }
});

// GET /api/inventory/suppliers
router.get('/suppliers', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { inventoryItems: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve suppliers.' });
  }
});

// POST /api/inventory/suppliers (Admin only)
router.post('/suppliers', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, contactPerson, phone, email, address } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Supplier name is required.' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
      },
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
});

// POST /api/inventory (Admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, currentQuantity = 0, unit, minThreshold = 5, reorderQuantity = 10, unitCost = 0, storageLocation, supplierId } = req.body;

    if (!name || !category || !unit) {
      res.status(400).json({ error: 'Name, category, and unit are required.' });
      return;
    }

    const initialQty = Number(currentQuantity) || 0;

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          name: name.trim(),
          category: category.trim(),
          currentQuantity: initialQty,
          unit: unit.trim(),
          minThreshold: Number(minThreshold),
          reorderQuantity: Number(reorderQuantity),
          unitCost: Number(unitCost),
          storageLocation: storageLocation?.trim() || null,
          supplierId: supplierId || null,
        },
      });

      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            inventoryItemId: created.id,
            type: 'PURCHASE',
            quantityChange: initialQty,
            previousQuantity: 0,
            newQuantity: initialQty,
            reason: 'Initial stock on creation',
            performedById: req.user!.id,
          },
        });
      }

      return created;
    });

    await createAuditLog({
      eventType: 'INVENTORY_ITEM_CREATED',
      action: `Added stock item: ${item.name} (${item.currentQuantity} ${item.unit})`,
      entityType: 'InventoryItem',
      entityId: item.id,
      performedById: req.user!.id,
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create inventory item.' });
  }
});

// PUT /api/inventory/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, category, unit, minThreshold, reorderQuantity, unitCost, storageLocation, supplierId } = req.body;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        category: category !== undefined ? category.trim() : existing.category,
        unit: unit !== undefined ? unit.trim() : existing.unit,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : existing.minThreshold,
        reorderQuantity: reorderQuantity !== undefined ? Number(reorderQuantity) : existing.reorderQuantity,
        unitCost: unitCost !== undefined ? Number(unitCost) : existing.unitCost,
        storageLocation: storageLocation !== undefined ? storageLocation?.trim() : existing.storageLocation,
        supplierId: supplierId !== undefined ? supplierId : existing.supplierId,
      },
    });

    await createAuditLog({
      eventType: 'INVENTORY_ITEM_UPDATED',
      action: `Updated stock item settings: ${updated.name}`,
      entityType: 'InventoryItem',
      entityId: updated.id,
      performedById: req.user!.id,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update inventory item.' });
  }
});

// POST /api/inventory/:id/purchase - Record incoming purchase
router.post('/:id/purchase', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { quantity, unitCost, supplierId, invoiceNumber, notes } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: 'Valid purchase quantity is required.' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const newQty = item.currentQuantity + qty;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          currentQuantity: newQty,
          lastPurchaseDate: new Date(),
          unitCost: unitCost !== undefined ? Number(unitCost) : item.unitCost,
          supplierId: supplierId || item.supplierId,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: 'PURCHASE',
          quantityChange: qty,
          previousQuantity: item.currentQuantity,
          newQuantity: newQty,
          reason: notes || `Stock Purchase (Invoice: ${invoiceNumber || 'N/A'})`,
          performedById: req.user!.id,
        },
      });

      return { updated, movement };
    });

    await createAuditLog({
      eventType: 'STOCK_PURCHASED',
      action: `Purchased +${qty} ${item.unit} of ${item.name}`,
      entityType: 'InventoryItem',
      entityId: item.id,
      performedById: req.user!.id,
      details: { quantityAdded: qty, newTotal: newQty },
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record purchase.' });
  }
});

// POST /api/inventory/:id/adjust - Manual adjustment with required reason
router.post('/:id/adjust', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { newQuantity, reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ error: 'A specific reason is strictly required for manual stock adjustments.' });
      return;
    }

    const targetQty = Number(newQuantity);
    if (isNaN(targetQty) || targetQty < 0) {
      res.status(400).json({ error: 'Valid non-negative new quantity is required.' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const delta = targetQty - item.currentQuantity;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { currentQuantity: targetQty },
      });

      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: 'MANUAL_ADJUSTMENT',
          quantityChange: delta,
          previousQuantity: item.currentQuantity,
          newQuantity: targetQty,
          reason: reason.trim(),
          performedById: req.user!.id,
        },
      });

      return { updated, movement };
    });

    await createAuditLog({
      eventType: 'STOCK_ADJUSTED',
      action: `Adjusted stock for ${item.name}: ${item.currentQuantity} -> ${targetQty} ${item.unit}`,
      entityType: 'InventoryItem',
      entityId: item.id,
      performedById: req.user!.id,
      reason: reason.trim(),
      details: { previous: item.currentQuantity, updated: targetQty, change: delta },
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to adjust stock.' });
  }
});

// POST /api/inventory/:id/wastage - Record wastage or damaged stock
router.post('/:id/wastage', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { quantity, reason, isDamage } = req.body;

    const wasteQty = Number(quantity);
    if (isNaN(wasteQty) || wasteQty <= 0) {
      res.status(400).json({ error: 'Valid wastage quantity is required.' });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ error: 'A specific explanation is required to record wastage.' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const newQty = Math.max(0, item.currentQuantity - wasteQty);
    const type = isDamage ? 'DAMAGE' : 'WASTAGE';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { currentQuantity: newQty },
      });

      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type,
          quantityChange: -wasteQty,
          previousQuantity: item.currentQuantity,
          newQuantity: newQty,
          reason: reason.trim(),
          performedById: req.user!.id,
        },
      });

      return { updated, movement };
    });

    await createAuditLog({
      eventType: 'STOCK_WASTAGE_RECORDED',
      action: `Recorded ${type.toLowerCase()} of ${wasteQty} ${item.unit} for ${item.name}`,
      entityType: 'InventoryItem',
      entityId: item.id,
      performedById: req.user!.id,
      reason: reason.trim(),
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record wastage.' });
  }
});

export default router;
