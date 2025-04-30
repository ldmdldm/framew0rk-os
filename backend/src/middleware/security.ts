import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Express, Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { MetaGPTConfig } from '../config/metagptConfig';
import { logger } from '../utils/logger';

interface JWTPayload {
  walletAddress: string;
  roles: string[];
  projectId?: string;
  exp: number;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private config: MetaGPTConfig;
  private readonly JWT_SECRET: string;
  private readonly TOKEN_EXPIRY: string = '24h';

  private constructor() {
    this.config = MetaGPTConfig.getInstance();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  }

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  async authenticateToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
      }

      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      req.user = payload;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please authenticate again'
        });
      }
      
      logger.error('Authentication error:', error);
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }
  }

  async authorizeRoles(roles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user as JWTPayload;

        if (!user) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'User not authenticated'
          });
        }

        const hasRequiredRole = roles.some(role => user.roles.includes(role));
        if (!hasRequiredRole) {
          return res.status(403).json({
            error: 'Unauthorized',
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        next(error);
      }
    };
  }

  async verifyWalletSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { signature, message, walletAddress } = req.body;

      if (!signature || !message || !walletAddress) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Signature verification failed: Missing required fields'
        });
      }

      // Recover the address from the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          error: 'Invalid signature',
          message: 'Signature verification failed'
        });
      }

      // Generate JWT token
      const token = this.generateToken(walletAddress);

      // Add token to response
      res.locals.token = token;
      next();
    } catch (error) {
      logger.error('Signature verification error:', error);
      next(error);
    }
  }

  private generateToken(walletAddress: string, roles: string[] = ['user']): string {
    const payload: Omit<JWTPayload, 'exp'> = {
      walletAddress,
      roles
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }

  async validateProjectAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JWTPayload;
      const projectId = req.params.projectId || req.body.projectId;

      if (!projectId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Project ID is required'
        });
      }

      // Check if user has access to the project
      const hasAccess = await this.checkProjectAccess(user.walletAddress, projectId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'No access to this project'
        });
      }

      next();
    } catch (error) {
      logger.error('Project access validation error:', error);
      next(error);
    }
  }

  private async checkProjectAccess(walletAddress: string, projectId: string): Promise<boolean> {
    try {
      const redis = await this.config.getRedis();
      const key = `project:${projectId}:members`;
      
      // Check if wallet is in project members list
      const isMember = await redis.sismember(key, walletAddress);
      return isMember === 1;
    } catch (error) {
      logger.error('Project access check error:', error);
      return false;
    }
  }

  async validateRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JWTPayload;
      const { role, action } = req.body;

      if (!role || !action) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Role and action are required'
        });
      }

      // Check if user has permission for the role action
      const hasPermission = await this.checkRolePermission(user.walletAddress, role, action);
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'Insufficient permissions for this role action'
        });
      }

      next();
    } catch (error) {
      logger.error('Role permission validation error:', error);
      next(error);
    }
  }

  private async checkRolePermission(walletAddress: string, role: string, action: string): Promise<boolean> {
    try {
      const redis = await this.config.getRedis();
      const key = `permissions:${walletAddress}:${role}`;
      
      // Check if action is in allowed actions for role
      const permissions = await redis.smembers(key);
      return permissions.includes(action) || permissions.includes('*');
    } catch (error) {
      logger.error('Role permission check error:', error);
      return false;
    }
  }

  async rateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JWTPayload;
      const redis = await this.config.getRedis();
      
      const key = `ratelimit:${user.walletAddress}`;
      const limit = 100; // requests per window
      const window = 900; // 15 minutes in seconds

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, window);
      }

      if (current > limit) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
      }

      // Add rate limit info to response headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (limit - current).toString(),
        'X-RateLimit-Reset': (await redis.ttl(key)).toString()
      });

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      next(error);
    }
  }

  async validateSignature(signature: string, message: string, expectedAddress: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      logger.error('Signature validation error:', error);
      return false;
    }
  }
}

export const setupSecurity = (app: Express) => {
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
  });

  // Apply rate limiting to all routes
  app.use('/api/', limiter);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // CORS configuration is already set up in index.ts

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip
      });
    });
    next();
  });

  // Error handling middleware
  app.use((err: Error, req: any, res: any, next: any) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    });
  });
};