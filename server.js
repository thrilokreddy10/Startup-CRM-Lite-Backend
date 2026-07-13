import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Security and optimization packages
import rateLimit from 'express-rate-limit';
import { sanitize } from 'express-mongo-sanitize';

// Internal module imports
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables from .env file
dotenv.config();

// ==========================================
// Environment Validation
// ==========================================
const checkRequiredEnvVars = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const missing = required.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};

// Validate before establishing connections
checkRequiredEnvVars();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB Atlas
connectDB();

// Initialize Express application
const app = express();

// ==========================================
// Middleware Configuration
// ==========================================

// helmet() helps secure Express apps by setting various HTTP headers
app.use(helmet());

// Request logging improvement
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // More detailed format for production
} else {
  app.use(morgan('dev')); // Concise, colorized format for development
}

// Update CORS for production
const allowedOrigins = [process.env.FRONTEND_URL, 'https://your-app.vercel.app'];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser: limits size to 10kb to prevent payload too large attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Injection Protection (sanitizes req.body, req.query, req.params)
// Express-5-safe pattern that mutates req.query keys in place
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      req.query[key] = sanitize(req.query[key]);
    });
  }
  next();
});

// ==========================================
// Rate Limiting
// ==========================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts.' }
});

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ==========================================
// Routes
// ==========================================

// Health check endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date()
  });
});

// Dynamic imports for routes to prevent server crash if they are not yet created
const registerRoutes = async () => {
  try {
    const authRoutesPath = path.join(__dirname, 'routes', 'authRoutes.js');
    if (fs.existsSync(authRoutesPath)) {
      const { default: authRoutes } = await import('./routes/authRoutes.js');
      app.use('/api/auth', authRoutes);
    } else {
      console.warn('⚠️ routes/authRoutes.js not found. /api/auth routes are not active.');
    }

    const leadRoutesPath = path.join(__dirname, 'routes', 'leadRoutes.js');
    if (fs.existsSync(leadRoutesPath)) {
      const { default: leadRoutes } = await import('./routes/leadRoutes.js');
      app.use('/api/leads', leadRoutes);
    } else {
      console.warn('⚠️ routes/leadRoutes.js not found. /api/leads routes are not active.');
    }
  } catch (err) {
    console.error('Error registering routes:', err);
  }

  // ==========================================
  // Error Handling
  // ==========================================
  
  // Register the global error handler LAST
  app.use(errorHandler);

  // ==========================================
  // Server Startup
  // ==========================================
  const PORT = process.env.PORT || 5000;
  const MODE = process.env.NODE_ENV || 'development';

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${MODE} mode`);
  });

  // ==========================================
  // Graceful Shutdown
  // ==========================================
  const gracefulShutdown = () => {
    console.log('Server shutting down gracefully');
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

// Start the route registration and server
registerRoutes();
