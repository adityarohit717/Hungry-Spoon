import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/audit - List audit logs (Admin only)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, entityType, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType;
    }
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }
    if (search) {
      where.OR = [
        { action: { contains: String(search) } },
        { entityId: { contains: String(search) } },
        { reason: { contains: String(search) } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          performedBy: {
            select: { id: true, name: true, username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
        skip: parseInt(String(offset), 10),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;
