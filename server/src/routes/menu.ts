import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/menu - get all categories and items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.menuCategory.findMany({
      include: {
        items: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    inventoryItem: {
                      select: {
                        id: true,
                        name: true,
                        unit: true,
                        currentQuantity: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu items.' });
  }
});

// POST /api/menu/categories (Admin only)
router.post('/categories', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayOrder, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const category = await prisma.menuCategory.create({
      data: {
        name: name.trim(),
        displayOrder: displayOrder || 0,
        description: description?.trim() || null,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create category.' });
  }
});

// POST /api/menu/items (Admin only)
router.post('/items', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, categoryId, description, sellingPrice, imageUrl, preparationNotes, recipeIngredients } = req.body;

    if (!name || !categoryId || sellingPrice === undefined) {
      res.status(400).json({ error: 'Name, categoryId, and sellingPrice are required.' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        categoryId,
        description: description?.trim() || null,
        sellingPrice: Number(sellingPrice),
        imageUrl: imageUrl?.trim() || null,
        preparationNotes: preparationNotes?.trim() || null,
        isAvailable: true,
      },
    });

    // Create recipe if recipeIngredients are provided
    if (recipeIngredients && Array.isArray(recipeIngredients) && recipeIngredients.length > 0) {
      const recipe = await prisma.recipe.create({
        data: {
          menuItemId: item.id,
          notes: `Recipe for ${item.name}`,
        },
      });

      for (const ing of recipeIngredients) {
        if (ing.inventoryItemId && ing.quantityRequired) {
          await prisma.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              inventoryItemId: ing.inventoryItemId,
              quantityRequired: Number(ing.quantityRequired),
              unit: ing.unit || 'g',
            },
          });
        }
      }
    }

    await createAuditLog({
      eventType: 'MENU_ITEM_CREATED',
      action: `Added new menu item: ${item.name} (₹${item.sellingPrice})`,
      entityType: 'MenuItem',
      entityId: item.id,
      performedById: req.user!.id,
      details: { name: item.name, price: item.sellingPrice },
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create menu item.' });
  }
});

// PUT /api/menu/items/:id (Admin only)
router.put('/items/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, categoryId, description, sellingPrice, imageUrl, preparationNotes, recipeIngredients, isAvailable } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        categoryId: categoryId || existing.categoryId,
        description: description !== undefined ? description?.trim() : existing.description,
        sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : existing.sellingPrice,
        imageUrl: imageUrl !== undefined ? imageUrl?.trim() : existing.imageUrl,
        preparationNotes: preparationNotes !== undefined ? preparationNotes?.trim() : existing.preparationNotes,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existing.isAvailable,
      },
    });

    // Update recipe if provided
    if (recipeIngredients && Array.isArray(recipeIngredients)) {
      let recipe = await prisma.recipe.findUnique({ where: { menuItemId: id } });
      if (!recipe) {
        recipe = await prisma.recipe.create({
          data: { menuItemId: id, notes: `Recipe for ${updated.name}` },
        });
      }

      // Delete existing and re-insert
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      for (const ing of recipeIngredients) {
        if (ing.inventoryItemId && ing.quantityRequired) {
          await prisma.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              inventoryItemId: ing.inventoryItemId,
              quantityRequired: Number(ing.quantityRequired),
              unit: ing.unit || 'g',
            },
          });
        }
      }
    }

    await createAuditLog({
      eventType: 'MENU_ITEM_UPDATED',
      action: `Updated menu item: ${updated.name}`,
      entityType: 'MenuItem',
      entityId: updated.id,
      performedById: req.user!.id,
      details: {
        previousPrice: existing.sellingPrice,
        newPrice: updated.sellingPrice,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update menu item.' });
  }
});

// PATCH /api/menu/items/:id/availability (Admin & Staff)
router.patch('/:id/availability', authenticate, requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.menuItem.findUnique({ where: { id } });

    if (!item) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });

    await createAuditLog({
      eventType: 'MENU_AVAILABILITY_TOGGLED',
      action: `Marked "${item.name}" as ${updated.isAvailable ? 'Available' : 'Unavailable'}`,
      entityType: 'MenuItem',
      entityId: item.id,
      performedById: req.user!.id,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle menu item availability.' });
  }
});

export default router;
