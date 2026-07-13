/**
 * Utility functions for consistent API responses.
 */

/**
 * Sends a successful response.
 * @param {Object} res - Express response object
 * @param {any} data - The data to send
 * @param {string} message - Success message
 * @param {number} [statusCode=200] - HTTP status code
 */
export const successResponse = (res, data, message, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Sends an error response.
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {any} [errors=null] - Detailed errors (e.g., validation errors)
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

/**
 * Sends a paginated successful response.
 * @param {Object} res - Express response object
 * @param {Array} data - The paginated data
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 */
export const paginatedResponse = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};
