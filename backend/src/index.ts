import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './services/socketService';
import { setupSecurity } from './middleware/security';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Security middleware
setupSecurity(app);

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection with retry mechanism
const connectDB = async (retries = 5) => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-framework', options);
    logger.info('Connected to MongoDB');
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Failed to connect to MongoDB. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    }
    logger.error('Failed to connect to MongoDB after multiple retries', error);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

// Initialize database connection
connectDB();

// Setup routes
setupRoutes(app);

// Setup socket handlers
setupSocketHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json(health);
});

// Error handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Performing graceful shutdown...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('Server closed. Database connections terminated.');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});