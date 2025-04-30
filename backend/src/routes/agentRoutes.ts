import express from 'express';
import { AgentService } from '../services/agentService';
import { logger } from '../utils/logger';
import { Agent } from '../models/agent';
import { authenticateToken } from './authRoutes';

const router = express.Router();
const agentService = AgentService.getInstance();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().populate('roleId');
    res.json(agents);
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).populate('roleId');
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    logger.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Interact with agent
router.post('/interact', authenticateToken, async (req, res) => {
  try {
    const { role, message } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!role || !message) {
      return res.status(400).json({ error: 'Role and message are required' });
    }

    const response = await agentService.processMessage(role, message, walletAddress);
    res.json(response);
  } catch (error) {
    logger.error('Error interacting with agent:', error);
    res.status(500).json({ error: 'Failed to interact with agent' });
  }
});

// Get agent memory
router.get('/:roleName/memory', authenticateToken, async (req, res) => {
  try {
    const { roleName } = req.params;
    const agent = await Agent.findOne({ name: roleName });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Return agent's memory or conversation history
    res.json(agent.memory || []);
  } catch (error) {
    logger.error('Error fetching agent memory:', error);
    res.status(500).json({ error: 'Failed to fetch agent memory' });
  }
});

// Create new agent
router.post('/', async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    res.status(201).json(agent);
  } catch (error) {
    logger.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('roleId');
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    logger.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export const agentRoutes = router; 