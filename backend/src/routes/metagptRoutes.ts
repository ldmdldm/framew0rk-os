import express from 'express';
import { MetaGPTService } from '../services/metagptService';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const metagptService = MetaGPTService.getInstance();

// Initialize a new team for a project
router.post('/teams', authenticateToken, async (req, res) => {
  try {
    const { projectId, projectType, roles } = req.body;
    
    if (!projectId || !projectType || !roles) {
      return res.status(400).json({ 
        error: 'Project ID, type, and roles are required' 
      });
    }

    const team = await metagptService.initializeTeam(projectId, projectType, roles);
    res.status(201).json(team);
  } catch (error) {
    logger.error('Error initializing team:', error);
    res.status(500).json({ error: 'Failed to initialize team' });
  }
});

// Process a team request
router.post('/teams/:projectId/process', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await metagptService.processTeamRequest(projectId, message);
    res.json(response);
  } catch (error) {
    logger.error('Error processing team request:', error);
    res.status(500).json({ error: 'Failed to process team request' });
  }
});

// Get team status
router.get('/teams/:projectId/status', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const status = await metagptService.getTeamStatus(projectId);
    res.json(status);
  } catch (error) {
    logger.error('Error getting team status:', error);
    res.status(500).json({ error: 'Failed to get team status' });
  }
});

// Terminate a team
router.delete('/teams/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    await metagptService.terminateTeam(projectId);
    res.json({ message: 'Team terminated successfully' });
  } catch (error) {
    logger.error('Error terminating team:', error);
    res.status(500).json({ error: 'Failed to terminate team' });
  }
});

// WebSocket endpoint for real-time team updates
router.ws('/teams/:projectId/updates', (ws, req) => {
  const { projectId } = req.params;
  
  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      
      if (data.type === 'process') {
        const response = await metagptService.processTeamRequest(projectId, data.message);
        ws.send(JSON.stringify({
          type: 'response',
          data: response
        }));
      }
    } catch (error) {
      logger.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process request'
      }));
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket connection closed for project ${projectId}`);
  });
});

export const metagptRoutes = router;