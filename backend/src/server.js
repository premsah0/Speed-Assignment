import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initSocketServer } from './socket/supportSocket.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Security Middleware (allowing cross-origin resource access for uploaded images)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Logging Middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', apiRoutes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

// Start Server with Error Handling
const httpServer = createServer(app);
const io = initSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`[Speed Assignment Backend] Server running on http://localhost:${config.port}`);
  console.log(`[Speed Assignment Backend] Environment: ${config.nodeEnv}`);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Speed Assignment Backend] Port ${config.port} is already in use.`);
    console.error(`Note: On macOS, ControlCenter / AirPlay Receiver often uses port 5000. You can change PORT in .env or disable AirPlay Receiver in macOS System Settings.`);
  } else {
    console.error('[Speed Assignment Backend] Server error:', err);
  }
});
