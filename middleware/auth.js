import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware to protect routes by verifying JWT token.
 * Extracts the token from the Authorization header (Bearer token),
 * verifies it, and attaches the corresponding user to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  // Extract JWT from Authorization header: 'Bearer <token>'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If token is missing
  if (!token) {
    return errorResponse(res, 'No token provided, access denied', 401);
  }

  try {
    // Verify token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in database, exclude password field
    const user = await User.findById(decoded.id).select('-password');

    // If user not found
    if (!user) {
      return errorResponse(res, 'User belonging to this token no longer exists', 401);
    }

    // Attach user to req object
    req.user = user;
    next();
  } catch (error) {
    // Determine the type of JWT error
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired, please login again', 401);
    }
    // Generic invalid token error
    return errorResponse(res, 'Token is invalid', 401);
  }
};
