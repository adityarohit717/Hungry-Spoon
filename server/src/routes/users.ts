import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// GET /api/users (Admin only)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/users (Admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, name, password, role } = req.body;

    if (!username || !email || !name || !password) {
      res.status(400).json({ error: 'Missing required user fields.' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase().trim() }, { email: email.toLowerCase().trim() }],
      },
    });

    if (existing) {
      res.status(400).json({ error: 'Username or email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';

    const newUser = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        role: userRole,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      eventType: 'USER_CREATED',
      action: `Created ${userRole} account: ${newUser.username}`,
      entityType: 'User',
      entityId: newUser.id,
      performedById: req.user!.id,
      details: { username: newUser.username, role: newUser.role },
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PATCH /api/users/:id/toggle-status (Admin only)
router.patch('/:id/toggle-status', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'Cannot deactivate your own administrator account.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
      select: { id: true, username: true, isActive: true },
    });

    await createAuditLog({
      eventType: 'USER_STATUS_CHANGED',
      action: `${updated.isActive ? 'Activated' : 'Deactivated'} account: ${targetUser.username}`,
      entityType: 'User',
      entityId: targetUser.id,
      performedById: req.user!.id,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

export default router;
