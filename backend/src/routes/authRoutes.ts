import express from 'express';
import { AgentService } from '../services/agentService';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const router = express.Router();
const agentService = AgentService.getInstance();

// Verify wallet ownership and generate JWT
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature are required' });
    }

    const isValid = await agentService.verifyWalletOwnership(walletAddress, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { walletAddress },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    logger.error('Error verifying wallet:', error);
    res.status(500).json({ error: 'Failed to verify wallet' });
  }
});

// Middleware to verify JWT token
export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export const authRoutes = router; 