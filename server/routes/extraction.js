import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { uploadToWebDAV } from '../services/webdav.js';
import { generateTags } from '../services/aiTagger.js';
import { generateHTMLWithInlineImages } from '../services/htmlGenerator.js';

const router = express.Router();

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

// Optional authentication middleware
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

// Content extraction route (supports both authenticated and anonymous users)
router.post('/extract', optionalAuth, async (req, res) => {
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
    
    // Create filename from article title
    const safeFilename = createSafeFilename(title);
    const filename = `${safeFilename}.html`;
    
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

    // Generate HTML with inline images
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

// Tag suggestion route
router.post('/suggest-tags', optionalAuth, async (req, res) => {
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

export default router;