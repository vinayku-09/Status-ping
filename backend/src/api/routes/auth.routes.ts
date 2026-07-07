/**
 * Authentication routes
 * Handles user registration, login, and profile retrieval
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from '../../lib/errors.js';
import { JwtPayload, ApiResponse } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = Router();
const logger = createLogger('api', 'auth-routes');

// Validation Schemas

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().max(100, 'Name must be at most 100 characters').optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Helper Functions

/**
 * Generate JWT token for a user
 * @param userId - User ID
 * @param email - User email
 * @returns Signed JWT token
 */
function generateToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    sub: userId,
    email,
  };

  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare a plain text password with a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if passwords match
 */
async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Routes

/**
 * POST /api/auth/register
 * Register a new user account
 * 
 * @body {email, password, name?}
 * @returns {201} User object and JWT token
 * @throws {400} Validation error
 * @throws {409} Email already exists
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = RegisterSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationError('Invalid registration data', validationResult.error.format());
    }

    const { email, password, name } = validationResult.data;

    logger.info({ email }, 'Registration attempt');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn({ email }, 'Registration failed: email already exists');
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    const response: ApiResponse<{ token: string; user: typeof user }> = {
      data: {
        token,
        user,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Registration error');
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user and return JWT token
 * 
 * @body {email, password}
 * @returns {200} User object and JWT token
 * @throws {400} Validation error
 * @throws {401} Invalid credentials
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = LoginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationError('Invalid login data', validationResult.error.format());
    }

    const { email, password } = validationResult.data;

    logger.info({ email }, 'Login attempt');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn({ email }, 'Login failed: user not found');
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      logger.warn({ userId: user.id, email }, 'Login failed: invalid password');
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    const response: ApiResponse<{
      token: string;
      user: {
        id: string;
        email: string;
        name: string | null;
      };
    }> = {
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 * 
 * @requires Authentication
 * @returns {200} User profile
 * @throws {401} Not authenticated
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;

    logger.debug({ userId }, 'Fetching user profile');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const response: ApiResponse<typeof user> = {
      data: user,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user profile');
    next(error);
  }
});

export default router;