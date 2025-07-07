import express from 'express';
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
import { generateTags } from './services/aiTagger.js';
import { analyzeSourcesFromWebDAV, analyzeSingleSource } from './services/sourceAnalyzer.js';
import { generateHTMLWithInlineImages } from './services/htmlGenerator.js';
import cleanupRoutes from './routes/cleanup.js';
import sourceRoutes from './routes/sources.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://localhost:8081',  // Expo React Native dev server
    'http://localhost:19000', // Expo classic
    'http://localhost:19006', // Expo web
    'exp://localhost:19000',  // Expo app
    'exp://localhost:8081',   // Expo React Native
    'http://localhost:3000',  // Common React dev port
    'http://10.0.2.2:8081',   // Android emulator accessing host
  ],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ 
  limit: process.env.MAX_CONTENT_LENGTH || '10mb' 
}));

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

// Enhanced content extraction function
function extractMainContent($, url) {
  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments').remove();
  
  // Try to find the main content area
  let mainContent = null;
  
  // Common selectors for main content
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    '#content',
    '.post-body',
    '.article-body'
  ];
  
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 100) {
      mainContent = element;
      break;
    }
  }
  
  // If no main content found, try to extract based on text density
  if (!mainContent) {
    let bestElement = null;
    let maxScore = 0;
    
    $('div, section, article').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const textLength = text.length;
      const linkDensity = $elem.find('a').text().length / Math.max(textLength, 1);
      const paragraphs = $elem.find('p').length;
      
      // Score based on text length, paragraph count, and low link density
      const score = textLength * (1 - linkDensity) * Math.log(paragraphs + 1);
      
      if (score > maxScore && textLength > 200) {
        maxScore = score;
        bestElement = $elem;
      }
    });
    
    if (bestElement) {
      mainContent = bestElement;
    }
  }
  
  // Fallback to body if nothing found
  if (!mainContent) {
    mainContent = $('body');
  }
  
  // Clean up the selected content
  mainContent.find('script, style, .advertisement, .ads').remove();
  
  return mainContent;
}

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
    const $ = cheerio.load(html);
    
    // Extract metadata
    const title = $('title').text().trim() || 
                 $('h1').first().text().trim() || 
                 'Untitled';
    
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';
    
    // Extract main content
    const mainContent = extractMainContent($, validUrl.href);
    
    // 🎯 CREATE FILENAME FROM ARTICLE TITLE
    const safeFilename = createSafeFilename(title);
    const filename = `${safeFilename}.html`; // Changed to .html
    
    console.log(`📝 Generated filename: ${filename} (from title: "${title}")`);
    
    // Generate AI tags if WebDAV is configured
    let finalTags = [...userTags];
    const hasWebDAV = user && !!(user.webdavUrl && user.webdavUsername && user.webdavPassword);
    
    if (hasWebDAV) {
      try {
        const aiTags = await generateTags(title, mainContent.text(), validUrl.href, description);
        // Combine user tags with AI tags, removing duplicates
        finalTags = [...new Set([...userTags, ...aiTags])];
        console.log(`🤖 Generated tags: ${aiTags.join(', ')}`);
      } catch (error) {
        console.error('Tag generation failed:', error);
      }
    }

    // 🎨 GENERATE HTML WITH INLINE IMAGES
    console.log(`🎨 Generating HTML with inline images...`);
    const htmlResult = await generateHTMLWithInlineImages(
      mainContent.html() || '',
      validUrl.href,
      title,
      description,
      validUrl.href,
      {
        tags: finalTags,
        userTags: userTags,
        extractedBy: user?.username,
        aiGenerated: finalTags.length > userTags.length,
        originalFilename: filename,
        safeFilename: safeFilename
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
          title,
          description,
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
          hasInlineImages: true
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
      title,
      description,
      filename,
      content: htmlResult.html,
      wordCount: htmlResult.wordCount,
      imageCount: htmlResult.imageCount,
      url: validUrl.href,
      tags: finalTags,
      format: 'html',
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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    format: 'HTML with inline images'
  });
});

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'Web Ripper API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      extract: 'POST /api/extract',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      webdav: {
        settings: 'GET/POST /api/settings/webdav',
        test: 'POST /api/settings/webdav/test',
        files: 'GET /api/webdav/files'
      },
      sources: {
        analyze: 'GET /api/analyze/sources',
        feeds: 'POST /api/analyze/sources/feeds'
      },
      cleanup: 'POST /api/cleanup-css'
    },
    documentation: 'See README.md for full API documentation',
    timestamp: new Date().toISOString()
  });
});

// API status route
app.get('/api', (req, res) => {
  res.json({
    message: 'Web Ripper API is running',
    version: '2.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/health',
      'POST /api/extract',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET/POST /api/settings/webdav',
      'POST /api/settings/webdav/test',
      'GET /api/webdav/files',
      'GET /api/analyze/sources',
      'POST /api/analyze/sources/feeds',
      'POST /api/cleanup-css'
    ]
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    availableRoutes: {
      root: 'GET /',
      api: 'GET /api',
      health: 'GET /api/health',
      extract: 'POST /api/extract'
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Brutal Web Ripper server running at http://localhost:${port}`);
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
});