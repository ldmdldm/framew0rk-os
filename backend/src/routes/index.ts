import express from 'express';
import { agentRoutes } from './agentRoutes';
import { roleRoutes } from './roleRoutes';
import { authRoutes } from './authRoutes';

export const setupRoutes = (app: express.Application) => {
  app.use('/api/agents', agentRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/auth', authRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
}; 