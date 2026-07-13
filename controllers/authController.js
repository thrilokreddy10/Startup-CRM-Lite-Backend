import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Helper function to generate a JWT token.
 * @param {string} userId - The user's ID
 * @returns {string} - Signed JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Register a new user.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 409 Conflict is handled by global error handler if validation fails, 
      // but doing it explicitly here per instructions
      return errorResponse(res, 'Email already exists', 409);
    }

    // Create new User document
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate JWT
    const token = generateToken(user._id);

    // Return 201 with token and user
    // The user's password field is automatically removed by the User schema's toJSON method
    return successResponse(res, { token, user }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email, explicitly requesting the password field to be included for comparison
    const user = await User.findOne({ email }).select('+password');

    // If not found or password wrong: 401 "Invalid credentials"
    // Security best practice: never specify which part (email or password) was wrong
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // If user.isActive is false
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 403);
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Remove password from user object manually since we explicitly selected it
    const userObj = user.toObject();
    delete userObj.password;

    // Return 200 with token and user
    return successResponse(res, { token, user: userObj }, 'Logged in successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile.
 */
export const getProfile = async (req, res, next) => {
  try {
    // Return req.user (already attached by the protect middleware)
    return successResponse(res, { user: req.user }, 'Profile fetched successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    // Find user and explicitly select password to allow validation
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Allow updating name only (email changes need verification flow)
    if (name) {
      user.name = name;
    }

    // If new password provided: validate old password first, then hash new one
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(res, 'Current password is required to set a new password', 400);
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return errorResponse(res, 'Incorrect current password', 401);
      }

      user.password = newPassword;
      // Pre-save hook in User model will automatically hash the new password
    }

    // Save and return updated user
    await user.save();

    // Remove password before sending response
    const userObj = user.toObject();
    delete userObj.password;

    return successResponse(res, { user: userObj }, 'Profile updated successfully', 200);
  } catch (error) {
    next(error);
  }
};
