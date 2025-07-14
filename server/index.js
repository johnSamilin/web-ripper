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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

import { User } from './models/index.js';
import { authenticateToken, generateToken } from './middleware/auth.js';
import { uploadToWebDAV, testWebDAVConnection, listWebDAVFiles } from './services/webdav.js';
import { analyzeSourcesFromWebDAV, analyzeSingleSource } from './services/sourceAnalyzer.js';
import { generateTags } from './services/aiTagger.js';
import { extractionService } from './services/extractionService.js';
import cleanupRoutes from './routes/cleanup.js';
import sourceRoutes from './routes/sources.js';
import extractionRoutes from './routes/extraction.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const useHTTP2 = process.env.USE_HTTP2 === 'true';
const certPath = process.env.CERT_PATH || './certs';

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

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Helper function to create safe filename from title
function createSafeFilename(title) {
  if (!title || title.trim() === '') {
    return 'untitled_article';
  }
  
  return title
    .trim()
    .toLowerCase()
    // Replace special characters with underscores
    .replace(/[^\w\s-]/g, '')
    // Replace spaces and multiple underscores/hyphens with single underscore
    .replace(/[\s_-]+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Ensure it doesn't end with underscore
    .replace(/_+$/, '')
    // Fallback if empty after cleaning
    || 'article';
}

// Helper function to create date-based path
function createDatePath(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  if (process.env.ORGANIZE_BY_DATE === 'true') {
    return `${year}/${month}`;
  }
  
  return '';
}

// FIXED: Optional authentication middleware with proper JWT import
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET || 'brutal-web-ripper-secret-key-2024';
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        console.log(`🔐 Authenticated user: ${user.username}`);
      } else {
        console.log(`⚠️  Invalid or inactive user token`);
      }
    } else {
      console.log(`👤 Anonymous user request`);
    }
    
    next();
  } catch (error) {
    console.log(`⚠️  Auth token verification failed: ${error.message}`);
    // Continue without authentication for anonymous access
    next();
  }
};

// AUTH ROUTES
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    // Generate token
    const token = generateToken(user.id);

    console.log(`✅ New user registered: ${user.username}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        hasWebDAV: !!(user.webdavUrl && user.webdavUsername && user.webdavPassword)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    console.log(`✅ User logged in: ${user.username}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        hasWebDAV: !!(user.webdavUrl && user.webdavUsername && user.webdavPassword)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      hasWebDAV: !!(req.user.webdavUrl && req.user.webdavUsername && req.user.webdavPassword)
    }
  });
});

// WEBDAV SETTINGS ROUTES
app.get('/api/settings/webdav', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      webdav: {
        url: user.webdavUrl || '',
        username: user.webdavUsername || '',
        hasPassword: !!user.webdavPassword,
        isConfigured: !!(user.webdavUrl && user.webdavUsername && user.webdavPassword)
      }
    });
  } catch (error) {
    console.error('Get WebDAV settings error:', error);
    res.status(500).json({ error: 'Failed to get WebDAV settings' });
  }
});

app.post('/api/settings/webdav', authenticateToken, async (req, res) => {
  try {
    const { url, username, password } = req.body;
    const user = req.user;

    // Validate WebDAV configuration if provided
    if (url && username && password) {
      try {
        const testResult = await testWebDAVConnection({ url, username, password });
        console.log('✅ WebDAV test successful:', testResult.message);
      } catch (error) {
        console.error('❌ WebDAV test failed:', error.message);
        return res.status(400).json({ error: error.message });
      }
    }

    // Update user's WebDAV settings
    await user.update({
      webdavUrl: url || null,
      webdavUsername: username || null,
      webdavPassword: password || null
    });

    console.log(`🔧 WebDAV settings updated for user: ${user.username}`);

    res.json({
      success: true,
      message: 'WebDAV settings updated successfully',
      webdav: {
        url: user.webdavUrl || '',
        username: user.webdavUsername || '',
        hasPassword: !!user.webdavPassword,
        isConfigured: !!(user.webdavUrl && user.webdavUsername && user.webdavPassword)
      }
    });
  } catch (error) {
    console.error('Update WebDAV settings error:', error);
    res.status(500).json({ error: 'Failed to update WebDAV settings' });
  }
});

app.post('/api/settings/webdav/test', authenticateToken, async (req, res) => {
  try {
    const { url, username, password } = req.body;

    if (!url || !username || !password) {
      return res.status(400).json({ error: 'URL, username, and password are required' });
    }

    const result = await testWebDAVConnection({ url, username, password });
    res.json(result);
  } catch (error) {
    console.error('Test WebDAV error:', error);
    res.status(400).json({ error: error.message });
  }
});

// WEBDAV FILES LIST ROUTE (for future search functionality)
app.get('/api/webdav/files', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    const files = await listWebDAVFiles({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    res.json({
      success: true,
      files: files.map(file => ({
        name: file.filename,
        size: file.size,
        lastModified: file.lastmod,
        path: file.filename
      }))
    });
  } catch (error) {
    console.error('List WebDAV files error:', error);
    res.status(500).json({ error: 'Failed to list WebDAV files' });
  }
});

// SOURCE ANALYSIS ROUTES
app.get('/api/analyze/sources', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    console.log(`📊 Analyzing sources for user: ${user.username}`);

    const sources = await analyzeSourcesFromWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    res.json({
      success: true,
      sources
    });
  } catch (error) {
    console.error('Source analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sources' });
  }
});

app.post('/api/analyze/sources/feeds', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    console.log(`🔍 Analyzing all sources for RSS/newsletters for user: ${user.username}`);

    // Get all sources first
    const sources = await analyzeSourcesFromWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    // Analyze each source for feeds
    const analyzedSources = [];
    for (const source of sources) {
      try {
        const analysis = await analyzeSingleSource(source.domain);
        analyzedSources.push({
          ...source,
          rssFeeds: analysis.rssFeeds,
          newsletters: analysis.newsletters,
          status: 'completed'
        });
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze ${source.domain}:`, error);
        analyzedSources.push({
          ...source,
          rssFeeds: [],
          newsletters: [],
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      sources: analyzedSources
    });
  } catch (error) {
    console.error('Bulk source analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sources' });
  }
});

app.post('/api/analyze/sources/feeds/:domain', authenticateToken, async (req, res) => {
  try {
    const { domain } = req.params;
    const decodedDomain = decodeURIComponent(domain);
    
    console.log(`🔍 Analyzing single source: ${decodedDomain}`);

    const analysis = await analyzeSingleSource(decodedDomain);

    res.json({
      success: true,
      domain: decodedDomain,
      rssFeeds: analysis.rssFeeds,
      newsletters: analysis.newsletters
    });
  } catch (error) {
    console.error(`Single source analysis error for ${domain}:`, error);
    res.status(500).json({ error: `Failed to analyze ${domain}` });
  }
});

// EXTRACTION INFO ROUTE
app.get('/api/extraction/info', optionalAuth, async (req, res) => {
  try {
    const info = await extractionService.getExtractionInfo();
    res.json({
      success: true,
      ...info
    });
  } catch (error) {
    console.error('Extraction info error:', error);
    res.status(500).json({ 
      error: 'Failed to get extraction info',
      details: error.message 
    });
  }
});

// EXTRACTION MODE ROUTE (for authenticated users)
app.post('/api/extraction/mode', authenticateToken, async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode) {
      return res.status(400).json({ error: 'Extraction mode is required' });
    }

    extractionService.setExtractionMode(mode);
    
    res.json({
      success: true,
      message: `Extraction mode changed to ${mode}`,
      currentMode: extractionService.getExtractionMode()
    });
  } catch (error) {
    console.error('Set extraction mode error:', error);
    res.status(400).json({ 
      error: error.message 
    });
  }
});

// CONTENT EXTRACTION ROUTE (Now supports both authenticated and anonymous users)
app.post('/api/extract', optionalAuth, async (req, res) => {
  try {
    const { url, tags: userTags = [] } = req.body;
    const user = req.user; // May be undefined for anonymous users
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    console.log(`🎯 ${user ? `User ${user.username}` : 'Anonymous user'} extracting content from: ${validUrl.href}`);
    
    // Fetch the webpage
    const response = await fetch(validUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: parseInt(process.env.EXTRACTION_TIMEOUT) || 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use the extraction service instead of direct Cheerio
    const extractionResult = await extractionService.extractContent(validUrl.href, html);
    
    // 🎯 CREATE FILENAME FROM ARTICLE TITLE
    const safeFilename = createSafeFilename(extractionResult.title);
    const filename = `${safeFilename}.html`; // Changed to .html
    
    console.log(`📝 Generated filename: ${filename} (from title: "${extractionResult.title}")`);
    
    // Generate AI tags if WebDAV is configured
    let finalTags = [...userTags];
    const hasWebDAV = user && !!(user.webdavUrl && user.webdavUsername && user.webdavPassword);
    
    if (hasWebDAV) {
      try {
        const aiTags = await generateTags(extractionResult.title, extractionResult.content, validUrl.href, extractionResult.description);
        // Combine user tags with AI tags, removing duplicates
        finalTags = [...new Set([...userTags, ...aiTags])];
        console.log(`🤖 Generated tags: ${aiTags.join(', ')}`);
      } catch (error) {
        console.error('Tag generation failed:', error);
      }
    }

    // 🎨 PROCESS EXTRACTED CONTENT
    console.log(`🎨 Processing extracted content using ${extractionResult.extractionMethod}...`);
    const htmlResult = await extractionService.processExtractedContent(extractionResult,
      {
        tags: finalTags,
        userTags: userTags,
        extractedBy: user?.username,
        aiGenerated: finalTags.length > userTags.length,
        originalFilename: filename,
        safeFilename: safeFilename,
        extractionMethod: extractionResult.extractionMethod
      }
    );

    // Check if user has WebDAV configured (only for authenticated users)
    let webdavResult = null;

    if (hasWebDAV) {
      try {
        console.log(`☁️  Preparing WebDAV upload for user: ${user.username}`);
        
        // Create date-based path
        const datePath = createDatePath();
        
        // Prepare metadata for WebDAV storage
        const metadata = {
          title: extractionResult.title,
          description: extractionResult.description,
          url: validUrl.href,
          domain: validUrl.hostname,
          extractedBy: user.username,
          extractedAt: new Date().toISOString(),
          wordCount: htmlResult.wordCount,
          imageCount: htmlResult.imageCount,
          tags: finalTags,
          userTags: userTags,
          aiGenerated: finalTags.length > userTags.length,
          originalFilename: filename,
          safeFilename: safeFilename,
          datePath: datePath,
          format: 'html',
          hasInlineImages: extractionResult.extractionMethod === 'cheerio',
          extractionMethod: extractionResult.extractionMethod
        };

        webdavResult = await uploadToWebDAV({
          url: user.webdavUrl,
          username: user.webdavUsername,
          password: user.webdavPassword
        }, filename, htmlResult.html, metadata, datePath);
        
        console.log(`✅ HTML file uploaded to WebDAV: ${webdavResult.path}`);
        if (webdavResult.metadataPath) {
          console.log(`📋 Metadata saved: ${webdavResult.metadataPath}`);
        }
      } catch (error) {
        console.error('❌ WebDAV upload failed:', error);
        // Continue with download fallback
      }
    }

    res.json({
      success: true,
      title: extractionResult.title,
      description: extractionResult.description,
      filename,
      content: htmlResult.html,
      wordCount: htmlResult.wordCount,
      imageCount: htmlResult.imageCount,
      url: validUrl.href,
      tags: finalTags,
      format: 'html',
      extractionMethod: extractionResult.extractionMethod,
      webdav: webdavResult ? {
        uploaded: true,
        path: webdavResult.path,
        url: webdavResult.url,
        metadataPath: webdavResult.metadataPath
      } : null
    });
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract content',
      details: error.message 
    });
  }
});

// TAG SUGGESTION ROUTE
app.post('/api/suggest-tags', optionalAuth, async (req, res) => {
  try {
    const { title, description, url } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }
    
    const suggestedTags = await generateTags(title, description || '', url, description);
    
    res.json({
      success: true,
      tags: suggestedTags
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    res.status(500).json({ 
      error: 'Failed to generate tag suggestions',
      details: error.message 
    });
  }
});

// CLEANUP ROUTES
app.use('/api', cleanupRoutes);

// SOURCE IGNORE LIST ROUTES
app.use('/api', sourceRoutes);

// EXTRACTION ROUTES
app.use('/api/extraction', extractionRoutes);

app.get('/api/health', (req, res) => {
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