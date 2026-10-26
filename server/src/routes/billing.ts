import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { calculateBillingTotals, generateBillNumber } from '../services/billingService';
import { consumeStockForOrder } from '../services/inventoryService';

const router = Router();

// POST /api/billing/preview - Server-side calculation preview
router.post('/preview', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, discount = 0, taxRate = 5.0, serviceChargeRate = 0.0 } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const totals = calculateBillingTotals(
      order.items.filter((i) => i.status !== 'CANCELLED'),
      Number(discount),
      Number(taxRate),
      Number(serviceChargeRate)
    );

    res.json(totals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate bill preview.' });
  }
});

// POST /api/billing/finalize - Finalize Customer Bill
router.post('/finalize', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      orderId,
      discount = 0,
      discountReason,
      serviceChargeRate = 0,
      markAsPaid = false,
      paymentMethod = 'UPI',
      paymentReference,
    } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        bill: true,
        kots: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.bill) {
      res.status(400).json({
        error: `Customer bill already exists for this order: ${order.bill.billNumber}`,
      });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot finalize bill for a cancelled order.' });
      return;
    }

    const settings = await prisma.restaurantSettings.findFirst();
    const taxRate = settings?.defaultTaxRate ?? 5.0;

    const activeItems = order.items.filter((i) => i.status !== 'CANCELLED');
    if (activeItems.length === 0) {
      res.status(400).json({ error: 'Order contains no active items to bill.' });
      return;
    }

    const totals = calculateBillingTotals(activeItems, Number(discount), taxRate, Number(serviceChargeRate));
    const initialPaymentStatus = markAsPaid ? 'PAID' : 'UNPAID';

    const finalizedBill = await prisma.$transaction(async (tx) => {
      const billNumber = await generateBillNumber(tx);

      const bill = await tx.customerBill.create({
        data: {
          billNumber,
          orderId: order.id,
          subtotal: totals.subtotal,
          discount: totals.discount,
          discountReason: discountReason?.trim() || null,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          serviceCharge: totals.serviceCharge,
          grandTotal: totals.grandTotal,
          paymentStatus: initialPaymentStatus,
          finalizedById: req.user!.id,
          items: {
            create: activeItems.map((item) => ({
              menuItemId: item.menuItemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: true,
          order: true,
        },
      });

      // If marked as paid immediately upon finalization, record the payment
      if (markAsPaid) {
        await tx.payment.create({
          data: {
            billId: bill.id,
            amount: totals.grandTotal,
            paymentMethod: paymentMethod || 'UPI',
            referenceNumber: paymentReference?.trim() || null,
            notes: 'Immediate payment at checkout',
            receivedById: req.user!.id,
          },
        });
      }

      // Update order status to COMPLETED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.taxAmount,
          grandTotal: totals.grandTotal,
        },
      });

      // Update KOT statuses to SERVED if ready
      await tx.kOT.updateMany({
        where: { orderId: order.id, status: { in: ['SENT_TO_KITCHEN', 'PREPARING', 'READY'] } },
        data: { status: 'SERVED' },
      });

      // Consume inventory stock now
      await consumeStockForOrder(order.id, req.user!.id, tx);

      return bill;
    });

    await createAuditLog({
      eventType: 'BILL_FINALIZED',
      action: `Finalized Bill #${finalizedBill.billNumber} (Order #${order.orderNumber}) - ₹${finalizedBill.grandTotal} (${initialPaymentStatus})`,
      entityType: 'CustomerBill',
      entityId: finalizedBill.id,
      performedById: req.user!.id,
      details: {
        billNumber: finalizedBill.billNumber,
        grandTotal: finalizedBill.grandTotal,
        subtotal: finalizedBill.subtotal,
        tax: finalizedBill.taxAmount,
        discount: finalizedBill.discount,
        paymentStatus: initialPaymentStatus,
        paymentMethod: markAsPaid ? paymentMethod : undefined,
      },
    });

    res.status(201).json(finalizedBill);
  } catch (error: any) {
    console.error('Error finalizing bill:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize bill.' });
  }
});

// GET /api/billing - List Customer Bills
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, paymentStatus, startDate, endDate, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.billDate.lte = end;
      }
    }
    if (search) {
      where.OR = [
        { billNumber: { contains: String(search) } },
        { order: { orderNumber: { contains: String(search) } } },
        { order: { tableNumber: { contains: String(search) } } },
      ];
    }

    const [bills, total] = await Promise.all([
      prisma.customerBill.findMany({
        where,
        include: {
          items: true,
          payments: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              orderType: true,
              tableNumber: true,
              status: true,
              kots: { select: { id: true, kotNumber: true, status: true } },
            },
          },
          finalizedBy: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { billDate: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
      prisma.customerBill.count({ where }),
    ]);

    res.json({ bills, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve bills.' });
  }
});

// GET /api/billing/:id - Retrieve Bill Details
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const bill = await prisma.customerBill.findUnique({
      where: { id },
      include: {
        items: true,
        payments: {
          include: { receivedBy: { select: { id: true, name: true } } },
        },
        order: {
          include: {
            kots: { include: { items: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        finalizedBy: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }

    const settings = await prisma.restaurantSettings.findFirst();

    res.json({ bill, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve bill.' });
  }
});

// POST /api/billing/:id/payment - Record Payment
router.post('/:id/payment', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amount, paymentMethod, referenceNumber, notes } = req.body;

    const bill = await prisma.customerBill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({ error: 'Invalid payment amount.' });
      return;
    }

    const totalPaidBefore = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidAfter = totalPaidBefore + paymentAmount;
    const newStatus = totalPaidAfter >= bill.grandTotal - 0.01 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount: paymentAmount,
          paymentMethod: paymentMethod || 'CASH',
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          receivedById: req.user!.id,
        },
      });

      await tx.customerBill.update({
        where: { id: bill.id },
        data: { paymentStatus: newStatus },
      });

      return createdPayment;
    });

    await createAuditLog({
      eventType: 'PAYMENT_RECORDED',
      action: `Recorded ${paymentMethod} payment of ₹${paymentAmount} for Bill #${bill.billNumber}`,
      entityType: 'Payment',
      entityId: payment.id,
      performedById: req.user!.id,
      details: {
        billNumber: bill.billNumber,
        amount: paymentAmount,
        paymentMethod,
        newStatus,
      },
    });

    res.status(201).json({ payment, paymentStatus: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record payment.' });
  }
});

// PATCH /api/billing/:id/payment-status - Direct quick payment status change
router.patch('/:id/payment-status', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, paymentMethod = 'UPI', referenceNumber } = req.body;

    if (!['PAID', 'UNPAID', 'PARTIALLY_PAID', 'REFUNDED'].includes(status)) {
      res.status(400).json({ error: 'Invalid payment status value.' });
      return;
    }

    const bill = await prisma.customerBill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If marking as PAID and no payments exist, record a full payment entry
      if (status === 'PAID') {
        const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, bill.grandTotal - totalPaid);
        if (remaining > 0) {
          await tx.payment.create({
            data: {
              billId: bill.id,
              amount: remaining,
              paymentMethod: paymentMethod || 'UPI',
              referenceNumber: referenceNumber?.trim() || null,
              notes: 'Quick status update',
              receivedById: req.user!.id,
            },
          });
        }
      }

      return await tx.customerBill.update({
        where: { id: bill.id },
        data: { paymentStatus: status },
        include: { payments: true, items: true },
      });
    });

    await createAuditLog({
      eventType: 'PAYMENT_STATUS_CHANGED',
      action: `Changed Bill #${bill.billNumber} payment status from ${bill.paymentStatus} to ${status}`,
      entityType: 'CustomerBill',
      entityId: bill.id,
      performedById: req.user!.id,
      details: { previousStatus: bill.paymentStatus, newStatus: status, paymentMethod },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update payment status.' });
  }
});

// DELETE /api/billing/:id - ADMIN ONLY permanent deletion
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason, confirm, deleteAssociatedKOTs = false } = req.body;

    if (!confirm) {
      res.status(400).json({ error: 'Explicit admin confirmation is required to delete a finalized bill.' });
      return;
    }

    const bill = await prisma.customerBill.findUnique({
      where: { id },
      include: {
        payments: true,
        order: {
          include: { kots: { include: { items: true } } },
        },
      },
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found.' });
      return;
    }

    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);

    await prisma.$transaction(async (tx) => {
      // Delete payments
      await tx.payment.deleteMany({ where: { billId: id } });
      // Delete bill items
      await tx.billItem.deleteMany({ where: { billId: id } });
      // Delete the bill itself
      await tx.customerBill.delete({ where: { id } });

      // If administrator chose Option B: delete associated KOTs
      if (deleteAssociatedKOTs && bill.order && bill.order.kots.length > 0) {
        for (const kot of bill.order.kots) {
          await tx.kOTItem.deleteMany({ where: { kotId: kot.id } });
          await tx.kOT.delete({ where: { id: kot.id } });
        }
      }

      // Revert order status to READY or CANCELLED
      await tx.order.update({
        where: { id: bill.orderId },
        data: { status: 'CANCELLED' },
      });
    });

    await createAuditLog({
      eventType: 'BILL_DELETED',
      action: `ADMIN DELETED Bill #${bill.billNumber} (Order #${bill.order.orderNumber}) ${deleteAssociatedKOTs ? 'AND associated KOTs' : 'KOTs preserved'}`,
      entityType: 'CustomerBill',
      entityId: bill.id,
      performedById: req.user!.id,
      reason: reason || 'Deleted by Administrator',
      details: {
        billNumber: bill.billNumber,
        grandTotal: bill.grandTotal,
        totalPaid,
        deleteAssociatedKOTs,
        orderNumber: bill.order.orderNumber,
      },
    });

    res.json({
      message: `Bill #${bill.billNumber} permanently deleted.${deleteAssociatedKOTs ? ' Associated KOTs also deleted.' : ' KOTs preserved.'}`,
    });
  } catch (error: any) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: error.message || 'Failed to delete bill.' });
  }
});

export default router;
