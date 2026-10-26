import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/kot - List KOTs
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { kotNumber: { contains: String(search) } },
        { tableNumber: { contains: String(search) } },
        { order: { orderNumber: { contains: String(search) } } },
      ];
    }

    const [kots, total] = await Promise.all([
      prisma.kOT.findMany({
        where,
        include: {
          items: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderType: true,
              tableNumber: true,
              status: true,
              bill: {
                select: { id: true, billNumber: true, paymentStatus: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
      prisma.kOT.count({ where }),
    ]);

    res.json({ kots, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve KOTs.' });
  }
});

// GET /api/kot/:id
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const kot = await prisma.kOT.findUnique({
      where: { id },
      include: {
        items: true,
        order: {
          include: {
            items: true,
            bill: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!kot) {
      res.status(404).json({ error: 'KOT not found.' });
      return;
    }

    res.json(kot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve KOT.' });
  }
});

// PATCH /api/kot/:id/status - Update kitchen status
router.patch('/:id/status', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid KOT status.' });
      return;
    }

    const existingKot = await prisma.kOT.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!existingKot) {
      res.status(404).json({ error: 'KOT not found.' });
      return;
    }

    const updatedKot = await prisma.$transaction(async (tx) => {
      const updated = await tx.kOT.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      // Synchronize order status
      if (status === 'PREPARING' && existingKot.order.status === 'SENT_TO_KITCHEN') {
        await tx.order.update({
          where: { id: existingKot.orderId },
          data: { status: 'PREPARING' },
        });
      } else if (status === 'READY') {
        // If all KOTs for this order are READY or SERVED, mark order as READY
        const otherKots = await tx.kOT.findMany({
          where: { orderId: existingKot.orderId, id: { not: id } },
        });
        const allReady = otherKots.every((k: any) => k.status === 'READY' || k.status === 'SERVED' || k.status === 'CANCELLED');
        if (allReady) {
          await tx.order.update({
            where: { id: existingKot.orderId },
            data: { status: 'READY' },
          });
        }
      }

      return updated;
    });

    await createAuditLog({
      eventType: 'KOT_STATUS_UPDATED',
      action: `KOT #${existingKot.kotNumber} status updated to ${status}`,
      entityType: 'KOT',
      entityId: existingKot.id,
      performedById: req.user!.id,
      details: { previousStatus: existingKot.status, newStatus: status },
    });

    res.json(updatedKot);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update KOT status.' });
  }
});

// DELETE /api/kot/:id - ADMIN ONLY permanent deletion
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason, confirm } = req.body;

    if (!confirm) {
      res.status(400).json({ error: 'Explicit admin confirmation is required to delete a KOT.' });
      return;
    }

    const kot = await prisma.kOT.findUnique({
      where: { id },
      include: {
        order: {
          include: { bill: true },
        },
      },
    });

    if (!kot) {
      res.status(404).json({ error: 'KOT not found.' });
      return;
    }

    // Perform deletion in transaction
    await prisma.$transaction(async (tx) => {
      // Delete KOT items first
      await tx.kOTItem.deleteMany({ where: { kotId: id } });
      // Delete KOT
      await tx.kOT.delete({ where: { id } });
    });

    await createAuditLog({
      eventType: 'KOT_DELETED',
      action: `ADMIN DELETED KOT #${kot.kotNumber} (Order #${kot.order.orderNumber})`,
      entityType: 'KOT',
      entityId: kot.id,
      performedById: req.user!.id,
      reason: reason || 'Deleted by Administrator',
      details: {
        kotNumber: kot.kotNumber,
        orderNumber: kot.order.orderNumber,
        hadFinalizedBill: !!kot.order.bill,
      },
    });

    res.json({ message: `KOT #${kot.kotNumber} permanently deleted.` });
  } catch (error: any) {
    console.error('Error deleting KOT:', error);
    res.status(500).json({ error: error.message || 'Failed to delete KOT.' });
  }
});

export default router;
