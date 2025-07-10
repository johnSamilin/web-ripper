import express from 'express';
import https from 'https';
import http2 from 'http2';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import route modules
import authRoutes from './routes/auth.js';
import webdavRoutes from './routes/webdav.js';
import extractionRoutes from './routes/extraction.js';
import analysisRoutes from './routes/analysis.js';
import acmeRoutes from './routes/acme.js';
import healthRoutes from './routes/health.js';
import cleanupRoutes from './routes/cleanup.js';
import sourceRoutes from './routes/sources.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const useHTTP2 = process.env.USE_HTTP2 === 'true';
const certPath = process.env.CERT_PATH || './certs';

// Create separate HTTP server for ACME challenges (Let's Encrypt)
const httpApp = express();
const httpPort = 80;

// ACME Challenge routes on HTTP server (port 80)
httpApp.use(acmeRoutes);

// Redirect all other HTTP traffic to HTTPS (when using HTTPS)
httpApp.get('*', (req, res) => {
  if (useHTTP2) {
    const httpsUrl = `https://${req.get('host').replace(':80', `:${port}`)}${req.url}`;
    console.log(`🔀 Redirecting HTTP to HTTPS: ${req.url} → ${httpsUrl}`);
    res.redirect(301, httpsUrl);
  } else {
    res.status(404).send('Not found');
  }
});

// Start HTTP server for ACME challenges
const httpServer = http.createServer(httpApp);

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${httpPort} (HTTP) is already in use - ACME challenges may not work`);
    console.log(`   This is normal if another web server is handling port 80`);
  } else if (error.code === 'EACCES') {
    console.log(`⚠️  Permission denied for port ${httpPort} - ACME challenges may not work`);
    console.log(`   Run with sudo or configure your web server to proxy ACME challenges`);
  } else {
    console.error('❌ HTTP server error:', error.message);
  }
});

// Try to start HTTP server for ACME challenges
try {
  httpServer.listen(httpPort, () => {
    console.log(`🔓 HTTP server running on port ${httpPort} for ACME challenges`);
  });
} catch (error) {
  console.log(`⚠️  Could not start HTTP server on port ${httpPort}: ${error.message}`);
  console.log(`   ACME challenges will not work unless handled by another web server`);
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  hsts: useHTTP2 ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || (useHTTP2 ? 'https://localhost:5173' : 'http://localhost:5173'),
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ 
  limit: process.env.MAX_CONTENT_LENGTH || '10mb' 
}));

// Serve static files from dist folder
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`📁 Serving static files from: ${distPath}`);
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));
} else {
  console.log(`⚠️  Dist folder not found at: ${distPath}`);
  console.log(`   Run 'npm run build' to generate static files`);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api', webdavRoutes);
app.use('/api', extractionRoutes);
app.use('/api', analysisRoutes);
app.use('/api', healthRoutes);
app.use('/api', cleanupRoutes);
app.use('/api', sourceRoutes);

// ACME challenge routes (also available on main server)
app.use(acmeRoutes);

// Catch-all route for SPA
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not built. Run npm run build first.');
  }
});

// Start server
if (useHTTP2) {
  // HTTP/2 with HTTPS
  const keyPath = path.join(certPath, 'server.key');
  const certFilePath = path.join(certPath, 'server.crt');
  
  if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
    console.error('❌ SSL certificates not found!');
    console.error(`   Expected files:`);
    console.error(`   - ${keyPath}`);
    console.error(`   - ${certFilePath}`);
    console.error(`   Run: npm run generate-cert`);
    process.exit(1);
  }
  
  // Validate certificate before starting server
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certFilePath);
    
    if (key.length === 0 || cert.length === 0) {
      throw new Error('Certificate or key file is empty');
    }
    
    console.log('🔍 SSL certificate validation passed');
  } catch (error) {
    console.error('❌ SSL certificate validation failed:', error.message);
    console.error('   Try regenerating certificates: npm run generate-cert');
    process.exit(1);
  }
  
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath),
    allowHTTP1: true, // Allow HTTP/1.1 fallback
    // HTTP/2 specific settings
    settings: {
      enablePush: false, // Disable server push for compatibility
      maxConcurrentStreams: 100,
      maxHeaderListSize: 8192,
      maxFrameSize: 16384,
      initialWindowSize: 65535
    }
  };
  
  // Use HTTPS server with HTTP/2 compatibility instead of pure HTTP/2
  const server = https.createServer(options);
  
  // Handle server on request event to work with Express
  server.on('request', app);
  
  // Enhanced error handling
  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    console.error('Error code:', error.code);
    
    switch (error.code) {
      case 'ERR_SSL_KEY_USAGE_INCOMPATIBLE':
        console.error('   Solution: Regenerate certificate with: npm run generate-cert');
        break;
      case 'EADDRINUSE':
        console.error(`   Port ${port} is already in use. Try a different port.`);
        break;
      case 'EACCES':
        console.error(`   Permission denied. Try running with sudo or use port > 1024.`);
        break;
      default:
        console.error('   Check server configuration and try again.');
    }
  });
  
  // Handle client errors gracefully
  server.on('clientError', (error, socket) => {
    console.warn('⚠️  Client error:', error.message);
    if (!socket.destroyed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });
  
  // Handle connection events
  server.on('connection', (socket) => {
    socket.on('error', (error) => {
      if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') {
        console.warn('⚠️  Socket error:', error.message);
      }
    });
  });
  
  // Handle secure connections
  server.on('secureConnection', (tlsSocket) => {
    const connectionInfo = {
      protocol: tlsSocket.getProtocol(),
      cipher: tlsSocket.getCipher()?.name,
      alpnProtocol: tlsSocket.alpnProtocol || 'http/1.1'
    };
    
    console.log('🔐 Secure connection:', connectionInfo);
    
    // Handle TLS socket errors
    tlsSocket.on('error', (error) => {
      if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') {
        console.warn('⚠️  TLS socket error:', error.message);
      }
    });
  });
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('\n📴 Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  server.listen(port, () => {
    console.log(`🚀 Brutal Web Ripper server running at https://localhost:${port}`);
    console.log(`🔐 Protocol: HTTPS with HTTP/2 support`);
    console.log(`🔒 TLS: Enabled with fallback to HTTP/1.1`);
    console.log(`🔐 Authentication optional - supports anonymous and authenticated users`);
    console.log(`☁️  WebDAV integration available for authenticated users`);
    console.log(`🤖 AI tagging ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled (using fallback)'}`);
    console.log(`📁 Files organized by date: ${process.env.ORGANIZE_BY_DATE === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`📝 Files will be named after article titles for better organization`);
    console.log(`📊 Source analysis available for authenticated users with WebDAV`);
    console.log(`🎨 Format: HTML with inline images for self-contained archiving`);
    console.log(`🧹 CSS cleanup script available for existing files`);
    console.log(`🚫 Source ignore list available for cleaner analysis`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Static files: ${fs.existsSync(distPath) ? 'Serving from dist/' : 'Not built - run npm run build'}`);
    console.log(`\n⚠️  Browser will show security warning for self-signed certificate`);
    console.log(`   Click "Advanced" → "Proceed to localhost" to continue`);
  });
} else {
  // HTTP/1.1
  const server = http.createServer(app);
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    
    switch (error.code) {
      case 'EADDRINUSE':
        console.error(`   Port ${port} is already in use. Try a different port.`);
        break;
      case 'EACCES':
        console.error(`   Permission denied. Try running with sudo or use port > 1024.`);
        break;
      default:
        console.error('   Check server configuration and try again.');
    }
  });
  
  // Handle client errors
  server.on('clientError', (error, socket) => {
    console.warn('⚠️  Client error:', error.message);
    if (!socket.destroyed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('\n📴 Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  server.listen(port, () => {
    console.log(`🚀 Brutal Web Ripper server running at http://localhost:${port}`);
    console.log(`🔐 Protocol: HTTP/1.1`);
    console.log(`🔐 Authentication optional - supports anonymous and authenticated users`);
    console.log(`☁️  WebDAV integration available for authenticated users`);
    console.log(`🤖 AI tagging ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled (using fallback)'}`);
    console.log(`📁 Files organized by date: ${process.env.ORGANIZE_BY_DATE === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`📝 Files will be named after article titles for better organization`);
    console.log(`📊 Source analysis available for authenticated users with WebDAV`);
    console.log(`🎨 Format: HTML with inline images for self-contained archiving`);
    console.log(`🧹 CSS cleanup script available for existing files`);
    console.log(`🚫 Source ignore list available for cleaner analysis`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Static files: ${fs.existsSync(distPath) ? 'Serving from dist/' : 'Not built - run npm run build'}`);
    console.log(`💡 To enable HTTP/2: Set USE_HTTP2=true and run npm run generate-cert`);
  });
}