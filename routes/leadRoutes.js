import express from 'express';
import { body } from 'express-validator';

import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  getMonthlyStats,
  searchLeads
} from '../controllers/leadController.js';

const router = express.Router();

// Apply protect middleware to ALL routes in this file
// This ensures req.user is populated and the token is valid for every endpoint below
router.use(protect);

// ==========================================
// Validation Rules
// ==========================================

const leadValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('company')
    .trim()
    .notEmpty().withMessage('Company is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Status must be one of the valid options'),
  body('source')
    .optional()
    .isIn(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'])
    .withMessage('Source must be one of the valid options')
];

const statusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'])
    .withMessage('Status must be one of the valid options')
];

// ==========================================
// Routes
// ==========================================

// Base route: /api/leads
router.route('/')
  .get(getLeads)
  .post(validate(leadValidation), createLead);

// Search route must be defined before /:id
router.get('/search', searchLeads);

// Stats routes must be defined before /:id so 'stats' isn't treated as an ID parameter
router.get('/stats/summary', getLeadStats);
router.get('/stats/monthly', getMonthlyStats);

// Single lead operations
router.route('/:id')
  .get(getLeadById)
  .put(validate(leadValidation), updateLead)
  .delete(deleteLead);

// Status update specifically
router.patch('/:id/status', validate(statusValidation), updateLeadStatus);

export default router;
