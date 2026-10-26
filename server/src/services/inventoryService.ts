import prisma from '../prisma';

export interface StockCheckResult {
  sufficient: boolean;
  shortages: {
    ingredientName: string;
    available: number;
    required: number;
    unit: string;
  }[];
}

export const checkStockAvailability = async (
  items: { menuItemId: string; quantity: number }[]
): Promise<StockCheckResult> => {
  const shortages: StockCheckResult['shortages'] = [];

  // Group total quantity needed per ingredient
  const ingredientRequirements: Record<string, { required: number; unit: string; name: string }> = {};

  for (const item of items) {
    const recipe = await prisma.recipe.findUnique({
      where: { menuItemId: item.menuItemId },
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (recipe && recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        const key = ing.inventoryItemId;
        const totalForLine = ing.quantityRequired * item.quantity;

        if (!ingredientRequirements[key]) {
          ingredientRequirements[key] = {
            required: 0,
            unit: ing.unit,
            name: ing.inventoryItem.name,
          };
        }
        ingredientRequirements[key].required += totalForLine;
      }
    }
  }

  // Check against current stock minus existing reservations
  for (const [inventoryId, req] of Object.entries(ingredientRequirements)) {
    const invItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        stockReservations: {
          where: { status: 'RESERVED' },
        },
      },
    });

    if (invItem) {
      const activeReserved = invItem.stockReservations.reduce(
        (sum, r) => sum + r.quantityReserved,
        0
      );
      const effectiveAvailable = Math.max(0, invItem.currentQuantity - activeReserved);

      if (effectiveAvailable < req.required) {
        shortages.push({
          ingredientName: invItem.name,
          available: Number(effectiveAvailable.toFixed(2)),
          required: Number(req.required.toFixed(2)),
          unit: req.unit,
        });
      }
    }
  }

  return {
    sufficient: shortages.length === 0,
    shortages,
  };
};

export const reserveStockForOrder = async (orderId: string, tx: any = prisma) => {
  // Check if already reserved
  const existing = await tx.stockReservation.findFirst({
    where: { orderId, status: 'RESERVED' },
  });
  if (existing) {
    return; // Already reserved
  }

  const orderItems = await tx.orderItem.findMany({
    where: { orderId, status: { not: 'CANCELLED' } },
  });

  for (const item of orderItems) {
    const recipe = await tx.recipe.findUnique({
      where: { menuItemId: item.menuItemId },
      include: { ingredients: true },
    });

    if (recipe && recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        const qtyNeeded = ing.quantityRequired * item.quantity;

        await tx.stockReservation.create({
          data: {
            orderId,
            inventoryItemId: ing.inventoryItemId,
            quantityReserved: qtyNeeded,
            unit: ing.unit,
            status: 'RESERVED',
          },
        });
      }
    }
  }
};

export const consumeStockForOrder = async (
  orderId: string,
  userId?: string,
  tx: any = prisma
) => {
  // Check if reservations exist for this order
  const reservations = await tx.stockReservation.findMany({
    where: { orderId },
  });

  // If already consumed, do nothing (idempotency safeguard)
  const alreadyConsumed = reservations.some((r: any) => r.status === 'CONSUMED');
  if (alreadyConsumed) {
    return;
  }

  if (reservations.length > 0) {
    // Process each reserved ingredient
    for (const res of reservations) {
      if (res.status === 'RESERVED') {
        const item = await tx.inventoryItem.findUnique({
          where: { id: res.inventoryItemId },
        });

        if (item) {
          const newQty = Math.max(0, item.currentQuantity - res.quantityReserved);

          // Update inventory quantity
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { currentQuantity: newQty },
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              inventoryItemId: item.id,
              type: 'USAGE_ORDER',
              quantityChange: -res.quantityReserved,
              previousQuantity: item.currentQuantity,
              newQuantity: newQty,
              reason: `Consumed for Order #${orderId}`,
              referenceId: orderId,
              performedById: userId,
            },
          });

          // Mark reservation as consumed
          await tx.stockReservation.update({
            where: { id: res.id },
            data: { status: 'CONSUMED' },
          });
        }
      }
    }
  } else {
    // No prior reservations: deduct directly based on order items
    const orderItems = await tx.orderItem.findMany({
      where: { orderId, status: { not: 'CANCELLED' } },
    });

    for (const item of orderItems) {
      const recipe = await tx.recipe.findUnique({
        where: { menuItemId: item.menuItemId },
        include: { ingredients: true },
      });

      if (recipe && recipe.ingredients) {
        for (const ing of recipe.ingredients) {
          const qtyNeeded = ing.quantityRequired * item.quantity;
          const invItem = await tx.inventoryItem.findUnique({
            where: { id: ing.inventoryItemId },
          });

          if (invItem) {
            const newQty = Math.max(0, invItem.currentQuantity - qtyNeeded);

            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { currentQuantity: newQty },
            });

            await tx.stockMovement.create({
              data: {
                inventoryItemId: invItem.id,
                type: 'USAGE_ORDER',
                quantityChange: -qtyNeeded,
                previousQuantity: invItem.currentQuantity,
                newQuantity: newQty,
                reason: `Direct deduction for Order #${orderId}`,
                referenceId: orderId,
                performedById: userId,
              },
            });

            await tx.stockReservation.create({
              data: {
                orderId,
                inventoryItemId: ing.inventoryItemId,
                quantityReserved: qtyNeeded,
                unit: ing.unit,
                status: 'CONSUMED',
              },
            });
          }
        }
      }
    }
  }
};

export const releaseStockReservations = async (
  orderId: string,
  userId?: string,
  tx: any = prisma
) => {
  const reservations = await tx.stockReservation.findMany({
    where: { orderId, status: 'RESERVED' },
  });

  for (const res of reservations) {
    await tx.stockReservation.update({
      where: { id: res.id },
      data: { status: 'RELEASED' },
    });
  }
};
