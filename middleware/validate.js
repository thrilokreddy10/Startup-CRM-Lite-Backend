import { validationResult } from 'express-validator';

/**
 * Middleware wrapper for express-validator checks.
 * Runs the validations, collects errors, and formats the response if errors exist.
 * 
 * @param {Array} validations - Array of express-validator middleware chains
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations concurrently
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Collect errors from the request
    const errors = validationResult(req);
    
    // If errors exist, return 400 with a formatted array of errors
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg
      }));
      
      return res.status(400).json({
        success: false,
        errors: formattedErrors
      });
    }

    // Call the next middleware if no errors
    next();
  };
};
