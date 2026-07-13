import Lead from '../models/Lead.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';

/**
 * Get all leads for the authenticated user with filtering, searching, and pagination.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getLeads = async (req, res, next) => {
  try {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      source,
      dateFrom,
      dateTo
    } = req.query;

    const filter = { owner: req.user._id };

    if (status && status !== 'All') filter.status = status;
    if (source && source !== 'All') filter.source = source;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex }
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const leads = await Lead.find(filter)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limitNumber);

    const total = await Lead.countDocuments(filter);
    const pages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,
      message: 'Leads fetched successfully',
      data: leads,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages,
        hasNext: pageNumber < pages,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search leads for quick autocomplete.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const searchLeads = async (req, res, next) => {
  try {
    const { q = '', limit = 5 } = req.query;
    
    if (!q) {
      return successResponse(res, [], 'Search results');
    }

    const searchRegex = new RegExp(q, 'i');
    
    const leads = await Lead.find({
      owner: req.user._id,
      $or: [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('_id name company email status')
    .limit(parseInt(limit, 10));

    return successResponse(res, leads, 'Search results');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lead.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const createLead = async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      owner: req.user._id
    };

    const newLead = await Lead.create(leadData);
    return successResponse(res, newLead, 'Lead created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific lead by ID.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    return successResponse(res, lead, 'Lead fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update a full lead by ID.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateLead = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.owner;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    return successResponse(res, lead, 'Lead updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update only the status of a lead.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    return successResponse(res, lead, 'Lead status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead by ID.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

    if (!lead) {
      return errorResponse(res, 'Lead not found', 404);
    }

    await lead.deleteOne();
    return successResponse(res, null, 'Lead deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregated statistics for the dashboard.
 * Uses a single MongoDB aggregation query for optimal performance.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getLeadStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const stats = await Lead.aggregate([
      { $match: { owner: req.user._id } },
      {
        $facet: {
          statusBreakdown: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          sourceBreakdown: [
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalLeads: { $sum: 1 },
                wonLeads: {
                  $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
                }
              }
            }
          ],
          thisMonthLeads: [
            { $match: { createdAt: { $gte: startOfThisMonth } } },
            { $count: 'count' }
          ],
          lastMonthLeads: [
            { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = stats[0];

    const statusBreakdown = {};
    result.statusBreakdown.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    const sourceBreakdown = {};
    result.sourceBreakdown.forEach(item => {
      if(item._id) sourceBreakdown[item._id] = item.count;
    });

    const totalLeads = result.totals[0]?.totalLeads || 0;
    const wonLeads = result.totals[0]?.wonLeads || 0;
    const conversionRate = totalLeads > 0 ? parseFloat(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

    const thisMonth = result.thisMonthLeads[0]?.count || 0;
    const lastMonth = result.lastMonthLeads[0]?.count || 0;

    let growthRate = 0;
    if (lastMonth === 0) {
      growthRate = thisMonth > 0 ? 100 : 0;
    } else {
      growthRate = parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1));
    }

    return successResponse(res, {
      totalLeads,
      statusBreakdown,
      conversionRate,
      sourceBreakdown,
      thisMonthLeads: thisMonth,
      lastMonthLeads: lastMonth,
      growthRate
    }, 'Stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly lead stats for the past 6 months.
 * Ensures months with 0 leads are represented in the dataset.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Pre-fill the last 6 months with 0s
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        year: d.getFullYear(),
        monthNum: d.getMonth() + 1,
        month: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
        total: 0,
        won: 0,
        lost: 0,
        conversionRate: 0
      });
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const stats = await Lead.aggregate([
      { 
        $match: { 
          owner: req.user._id,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } }
        }
      }
    ]);

    stats.forEach(stat => {
      const target = last6Months.find(m => m.year === stat._id.year && m.monthNum === stat._id.month);
      if (target) {
        target.total = stat.total;
        target.won = stat.won;
        target.lost = stat.lost;
        target.conversionRate = stat.total > 0 ? parseFloat(((stat.won / stat.total) * 100).toFixed(1)) : 0;
      }
    });

    const formattedStats = last6Months.map(({ month, total, won, lost, conversionRate }) => ({
      month, total, won, lost, conversionRate
    }));

    return successResponse(res, formattedStats, 'Monthly stats fetched successfully');
  } catch (error) {
    next(error);
  }
};
