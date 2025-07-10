import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const distPath = path.join(process.cwd(), 'dist');
  const useHTTP2 = process.env.USE_HTTP2 === 'true';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    format: 'HTML with inline images',
    protocol: useHTTP2 ? 'HTTP/2' : 'HTTP/1.1',
    static: fs.existsSync(distPath) ? 'Available' : 'Not built'
  });
});

export default router;