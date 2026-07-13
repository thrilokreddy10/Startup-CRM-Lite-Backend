import mongoose from 'mongoose';

/**
 * Mongoose schema for the Lead model.
 */
const leadSchema = new mongoose.Schema(
  {
    /**
     * The name of the lead (person).
     */
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minLength: [2, 'Name must be at least 2 characters long'],
      maxLength: [100, 'Name cannot exceed 100 characters']
    },
    /**
     * The company the lead belongs to.
     */
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true
    },
    /**
     * Contact email address for the lead.
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    /**
     * Contact phone number for the lead (optional).
     */
    phone: {
      type: String,
      trim: true
    },
    /**
     * Current status of the lead in the sales pipeline.
     */
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
        message: 'Status must be one of: New, Contacted, Meeting Scheduled, Proposal Sent, Won, Lost'
      },
      default: 'New'
    },
    /**
     * The source from which the lead originated.
     */
    source: {
      type: String,
      enum: {
        values: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'],
        message: 'Source must be one of: Website, Referral, LinkedIn, Cold Call, Email Campaign, Other'
      },
      default: 'Website'
    },
    /**
     * Additional notes or context regarding the lead.
     */
    notes: {
      type: String,
      maxLength: [1000, 'Notes cannot exceed 1000 characters']
    },
    /**
     * Reference to the User who created or owns this lead.
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lead must have an owner']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for age (in days)
leadSchema.virtual('age').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
});

// Indexes
leadSchema.index({ owner: 1, status: 1 });
leadSchema.index({ owner: 1, source: 1 });
leadSchema.index({ owner: 1, createdAt: -1 });
leadSchema.index({ email: 1 });

const Lead = mongoose.model('Lead', leadSchema);

export { leadSchema };
export default Lead;
