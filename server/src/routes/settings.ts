import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/settings
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.restaurantSettings.findFirst();
    if (!settings) {
      settings = await prisma.restaurantSettings.create({
        data: {
          restaurantName: 'Hungry Spoon',
          tagline: 'Artisanal Flavors & Modern Dining',
          address: 'Upper Road Sultanganj, Sri Plaza First Floor 813213',
          phone: '9534188701',
          email: 'contact@hungryspoon.com',
          gstNumber: '29ABCDE1234F1Z5',
          fssaiNumber: '11223344556677',
          defaultTaxRate: 5.0,
          defaultServiceCharge: 0.0,
          currencySymbol: '₹',
          receiptHeaderMessage: 'Welcome to Hungry Spoon!',
          receiptFooterMessage: 'Thank you for dining with us! Visit again.',
          allowNegativeStock: false,
        },
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve restaurant settings.' });
  }
});

// PUT /api/settings (Admin only)
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.restaurantSettings.findFirst();
    const updated = await prisma.restaurantSettings.update({
      where: { id: existing?.id },
      data: req.body,
    });

    await createAuditLog({
      eventType: 'SETTINGS_UPDATED',
      action: 'Updated Restaurant Settings & Billing Preferences',
      entityType: 'RestaurantSettings',
      entityId: updated.id,
      performedById: req.user!.id,
      details: req.body,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update restaurant settings.' });
  }
});

export default router;
