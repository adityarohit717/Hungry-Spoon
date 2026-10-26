import prisma from '../prisma';

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const calculateBillingTotals = (
  items: { unitPrice: number; quantity: number }[],
  discount: number = 0,
  taxRate: number = 5.0,
  serviceChargeRate: number = 0.0
) => {
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  const safeDiscount = Math.min(subtotal, Math.max(0, round2(discount)));
  const taxableAmount = Math.max(0, round2(subtotal - safeDiscount));
  const taxAmount = round2((taxableAmount * taxRate) / 100);
  const serviceCharge = round2((taxableAmount * serviceChargeRate) / 100);
  const grandTotal = round2(taxableAmount + taxAmount + serviceCharge);

  return {
    subtotal,
    discount: safeDiscount,
    taxableAmount,
    taxRate,
    taxAmount,
    serviceCharge,
    grandTotal,
  };
};

export const generateOrderNumber = async (tx: any = prisma): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await tx.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
  });

  let nextSeq = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
};

export const generateBillNumber = async (tx: any = prisma): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `BILL-${dateStr}-`;

  const lastBill = await tx.customerBill.findFirst({
    where: {
      billNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      billNumber: 'desc',
    },
  });

  let nextSeq = 1;
  if (lastBill && lastBill.billNumber) {
    const parts = lastBill.billNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
};
