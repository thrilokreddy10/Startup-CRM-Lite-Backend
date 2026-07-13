import express from 'express';
import { body } from 'express-validator';

import {
  register,
  login,
  getProfile,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * Note for Production:
 * Add `express-rate-limit` middleware to the login and register routes 
 * to prevent brute-force attacks and credential stuffing.
 * Example:
 * import rateLimit from 'express-rate-limit';
 * const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
 * router.post('/login', authLimiter, validate([...]), login);
 */

// ==========================================
// Validation Rules
// ==========================================

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// ==========================================
// Routes
// ==========================================

// Public routes
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);

// Protected routes (require valid JWT)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
