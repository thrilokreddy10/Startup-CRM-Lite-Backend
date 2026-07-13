import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global error handling middleware for Express.
 * Handles Mongoose, MongoDB, JWT, and generic errors.
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = null;

  // Log error stack in development mode for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // 1. Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    // Map field-by-field error messages
    errors = Object.values(err.errors).map((val) => val.message);
  }

  // 2. Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // 3. MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    // Extract the field that caused the duplicate key error
    const field = Object.keys(err.keyValue)[0];
    
    // Special handling for email as requested, though this scales to any field
    if (field === 'email') {
      message = 'Email already exists';
    } else {
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
  }

  // Include stack trace in development mode if no specific errors are set
  if (process.env.NODE_ENV === 'development' && !errors) {
    errors = err.stack;
  }

  // In production, ensure no stack traces are sent
  if (process.env.NODE_ENV === 'production') {
    errors = errors && typeof errors !== 'string' ? errors : null;
  }

  return errorResponse(res, message, statusCode, errors);
};

export default errorHandler;
