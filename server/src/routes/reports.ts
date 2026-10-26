import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { round2 } from '../services/billingService';

const router = Router();

// GET /api/reports/dashboard - Metrics for Bento Grid Dashboard
router.get('/dashboard', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Today's finalized bills
    const todayBills = await prisma.customerBill.findMany({
      where: {
        billDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        payments: true,
      },
    });

    const todaySales = round2(todayBills.reduce((sum, b) => sum + b.grandTotal, 0));
    const todayBillsCount = todayBills.length;
    const averageOrderValue = todayBillsCount > 0 ? round2(todaySales / todayBillsCount) : 0;

    // 2. Orders today
    const [todayOrdersCount, activeKitchenOrders, completedOrders] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.order.count({
        where: { status: { in: ['SENT_TO_KITCHEN', 'PREPARING'] } },
      }),
      prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
    ]);

    // 3. Low stock count
    const inventoryItems = await prisma.inventoryItem.findMany();
    const lowStockCount = inventoryItems.filter((i) => i.currentQuantity <= i.minThreshold).length;

    // 4. Last 7 days sales trend
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recentBills = await prisma.customerBill.findMany({
      where: {
        billDate: { gte: sevenDaysAgo },
      },
      select: {
        billDate: true,
        grandTotal: true,
      },
    });

    const salesTrendMap: Record<string, { date: string; sales: number; orders: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      salesTrendMap[key] = { date: key, sales: 0, orders: 0 };
    }

    for (const bill of recentBills) {
      const key = bill.billDate.toISOString().slice(5, 10);
      if (salesTrendMap[key]) {
        salesTrendMap[key].sales += bill.grandTotal;
        salesTrendMap[key].orders += 1;
      }
    }

    const salesTrend = Object.values(salesTrendMap).map((item) => ({
      ...item,
      sales: round2(item.sales),
    }));

    // 5. Popular menu items (ranked by bill items count)
    const billItems = await prisma.billItem.findMany({
      select: {
        itemName: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const itemSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const bi of billItems) {
      if (!itemSalesMap[bi.itemName]) {
        itemSalesMap[bi.itemName] = { name: bi.itemName, quantity: 0, revenue: 0 };
      }
      itemSalesMap[bi.itemName].quantity += bi.quantity;
      itemSalesMap[bi.itemName].revenue += bi.lineTotal;
    }

    const popularItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item) => ({ ...item, revenue: round2(item.revenue) }));

    // 6. Recent finalized bills
    const latestBills = await prisma.customerBill.findMany({
      take: 5,
      orderBy: { billDate: 'desc' },
      include: {
        order: { select: { orderNumber: true, orderType: true, tableNumber: true } },
      },
    });

    // 7. Active KOTs
    const activeKOTs = await prisma.kOT.findMany({
      where: { status: { in: ['SENT_TO_KITCHEN', 'PREPARING', 'READY'] } },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        order: { select: { orderNumber: true, orderType: true, tableNumber: true } },
      },
    });

    res.json({
      metrics: {
        todaySales,
        todayOrdersCount,
        activeKitchenOrders,
        completedOrders,
        averageOrderValue,
        lowStockCount,
      },
      salesTrend,
      popularItems,
      latestBills,
      activeKOTs,
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard metrics.' });
  }
});

// GET /api/reports/sales - Detailed sales analytics
router.get('/sales', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.billDate.lte = end;
      }
    }

    const bills = await prisma.customerBill.findMany({
      where,
      include: {
        items: true,
        payments: true,
        order: { select: { orderType: true } },
      },
    });

    const totalBills = bills.length;
    const grossSales = round2(bills.reduce((sum, b) => sum + b.subtotal, 0));
    const totalDiscounts = round2(bills.reduce((sum, b) => sum + b.discount, 0));
    const totalTaxes = round2(bills.reduce((sum, b) => sum + b.taxAmount, 0));
    const netSales = round2(bills.reduce((sum, b) => sum + b.grandTotal, 0));
    const averageOrderValue = totalBills > 0 ? round2(netSales / totalBills) : 0;

    // Payment method breakdown
    const paymentBreakdown: Record<string, { method: string; count: number; total: number }> = {
      CASH: { method: 'CASH', count: 0, total: 0 },
      UPI: { method: 'UPI', count: 0, total: 0 },
      CARD: { method: 'CARD', count: 0, total: 0 },
      OTHER: { method: 'OTHER', count: 0, total: 0 },
    };

    for (const b of bills) {
      for (const p of b.payments) {
        const method = p.paymentMethod || 'OTHER';
        if (!paymentBreakdown[method]) {
          paymentBreakdown[method] = { method, count: 0, total: 0 };
        }
        paymentBreakdown[method].count += 1;
        paymentBreakdown[method].total += p.amount;
      }
    }

    const paymentStats = Object.values(paymentBreakdown).map((p) => ({
      ...p,
      total: round2(p.total),
    }));

    // Order type breakdown
    const orderTypeBreakdown: Record<string, { type: string; count: number; total: number }> = {};
    for (const b of bills) {
      const type = b.order?.orderType || 'DINE_IN';
      if (!orderTypeBreakdown[type]) {
        orderTypeBreakdown[type] = { type, count: 0, total: 0 };
      }
      orderTypeBreakdown[type].count += 1;
      orderTypeBreakdown[type].total += b.grandTotal;
    }

    const orderTypeStats = Object.values(orderTypeBreakdown).map((o) => ({
      ...o,
      total: round2(o.total),
    }));

    res.json({
      summary: {
        totalBills,
        grossSales,
        totalDiscounts,
        totalTaxes,
        netSales,
        averageOrderValue,
      },
      paymentStats,
      orderTypeStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve sales reports.' });
  }
});

// GET /api/reports/export/sales-csv - Export sales as CSV
router.get('/export/sales-csv', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const bills = await prisma.customerBill.findMany({
      include: {
        order: { select: { orderNumber: true, orderType: true, tableNumber: true } },
        payments: true,
      },
      orderBy: { billDate: 'desc' },
    });

    const headers = [
      'Bill Number',
      'Date',
      'Order Number',
      'Order Type',
      'Table',
      'Subtotal (INR)',
      'Discount (INR)',
      'Tax (INR)',
      'Grand Total (INR)',
      'Payment Status',
      'Payment Methods',
    ];

    const rows = bills.map((b) => [
      b.billNumber,
      b.billDate.toISOString(),
      b.order?.orderNumber || 'N/A',
      b.order?.orderType || 'N/A',
      b.order?.tableNumber || 'N/A',
      b.subtotal.toFixed(2),
      b.discount.toFixed(2),
      b.taxAmount.toFixed(2),
      b.grandTotal.toFixed(2),
      b.paymentStatus,
      b.payments.map((p) => `${p.paymentMethod}: ₹${p.amount}`).join('; ') || 'None',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hungry_spoon_sales_report.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export sales CSV.' });
  }
});

export default router;
