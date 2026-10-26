import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase().trim() }, { email: username.toLowerCase().trim() }],
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, config.cookieOptions);

    // Audit log
    await createAuditLog({
      eventType: 'AUTH_LOGIN',
      action: 'User Logged In',
      entityType: 'User',
      entityId: user.id,
      performedById: user.id,
      details: { role: user.role, ip: req.ip },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token', config.cookieOptions);
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
