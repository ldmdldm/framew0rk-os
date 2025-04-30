import express from 'express';
import { Role } from '../models/role';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    logger.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create new role
router.post('/', async (req, res) => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    logger.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
router.put('/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json(role);
  } catch (error) {
    logger.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    logger.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export const roleRoutes = router; 