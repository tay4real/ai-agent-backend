import express from 'express';
import cors from 'cors';

const app = express();

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // Max requests per window

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const ipData = rateLimitMap.get(ip);

  if (now > ipData.resetTime) {
    // Reset the counter
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (ipData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  }

  ipData.count++;
  return next();
};

// Clean up old rate limit entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  },
  5 * 60 * 1000
);

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for audio
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Live Agent API',
    version: '1.0.0',
    endpoints: {
      POST: {
        '/api/chat': 'Send a text message',
        '/api/chat/stream': 'Stream chat responses',
        '/api/audio': 'Process audio input',
        '/api/tools': 'Use AI with tools',
        '/api/session/clear': 'Clear session memory',
        '/api/session/info': 'Get session info',
      },
    },
  });
});

export default app;
