import prisma from '../prisma';

export const generateKOTNumber = async (tx: any = prisma): Promise<string> => {
  const lastKOT = await tx.kOT.findFirst({
    orderBy: {
      kotNumber: 'desc',
    },
  });

  let nextSeq = 1001;
  if (lastKOT && lastKOT.kotNumber) {
    const parts = lastKOT.kotNumber.split('-');
    const lastSeq = parseInt(parts[1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `KOT-${nextSeq}`;
};

export const createKOTForOrder = async (
  orderId: string,
  userId?: string,
  isAmendment: boolean = false,
  itemsToInclude?: { menuItemId: string; itemName: string; quantity: number; instructions?: string; isCancelled?: boolean }[],
  tx: any = prisma,
  customKOTNumber?: string
) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      kots: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  let kotNumber = customKOTNumber?.trim();
  if (kotNumber) {
    const existing = await tx.kOT.findUnique({ where: { kotNumber } });
    if (existing) {
      kotNumber = `${kotNumber}-${Date.now().toString().slice(-3)}`;
    }
  } else {
    kotNumber = await generateKOTNumber(tx);
  }
  const version = (order.kots.length || 0) + 1;

  const kot = await tx.kOT.create({
    data: {
      kotNumber,
      orderId,
      version,
      status: 'SENT_TO_KITCHEN',
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      notes: order.orderNotes,
      createdById: userId,
    },
  });

  // Determine items to insert
  let itemsToInsert: any[] = [];
  if (itemsToInclude && itemsToInclude.length > 0) {
    itemsToInsert = itemsToInclude.map((item) => ({
      kotId: kot.id,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      instructions: item.instructions || null,
      isAmendment: isAmendment,
      isCancelled: item.isCancelled || false,
    }));
  } else {
    itemsToInsert = order.items
      .filter((i: any) => i.status !== 'CANCELLED')
      .map((item: any) => ({
        kotId: kot.id,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        instructions: item.notes || null,
        isAmendment: false,
        isCancelled: false,
      }));
  }

  if (itemsToInsert.length > 0) {
    await tx.kOTItem.createMany({
      data: itemsToInsert,
    });
  }

  return await tx.kOT.findUnique({
    where: { id: kot.id },
    include: { items: true, order: true },
  });
};
