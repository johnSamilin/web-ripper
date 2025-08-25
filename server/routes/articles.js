import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createClient } from 'webdav';

const router = express.Router();

// Search articles from WebDAV metadata
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    console.log(`🔍 Searching articles for user: ${user.username}`);

    // Ensure URL format is correct
    let webdavUrl = user.webdavUrl;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const client = createClient(webdavUrl, {
      username: user.webdavUsername,
      password: user.webdavPassword,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    const metadataDir = `${baseDir}/metadata`;
    
    console.log(`📁 Scanning metadata directory: ${metadataDir}`);

    // Get all metadata files
    let files;
    try {
      files = await client.getDirectoryContents(metadataDir, { deep: true });
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log(`📁 Metadata directory not found: ${metadataDir}`);
        return res.json({
          success: true,
          articles: [],
          message: 'No articles found. Extract some articles first.'
        });
      }
      throw error;
    }
    
    // Filter for JSON metadata files
    const metadataFiles = files.filter(file => 
      file.type === 'file' && file.filename.endsWith('.json')
    );

    console.log(`📋 Found ${metadataFiles.length} metadata files`);

    if (metadataFiles.length === 0) {
      return res.json({
        success: true,
        articles: [],
        message: 'No articles found. Extract some articles first.'
      });
    }

    // Process metadata files
    const articles = [];
    let processedCount = 0;
    let errorCount = 0;

    for (const file of metadataFiles) {
      try {
        console.log(`📄 Processing metadata file: ${file.filename}`);
        const content = await client.getFileContents(file.filename, { format: 'text' });
        const metadata = JSON.parse(content);
        
        // Validate required fields
        if (metadata.title && metadata.url && metadata.extractedAt) {
          articles.push({
            title: metadata.title,
            description: metadata.description || '',
            url: metadata.url,
            domain: metadata.domain || new URL(metadata.url).hostname,
            extractedAt: metadata.extractedAt,
            extractedBy: metadata.extractedBy || 'unknown',
            wordCount: metadata.wordCount || 0,
            imageCount: metadata.imageCount || 0,
            tags: metadata.tags || [],
            userTags: metadata.userTags || [],
            filename: metadata.originalFilename || file.filename,
            datePath: metadata.datePath || '',
            format: metadata.format || 'html',
            extractionMethod: metadata.extractionMethod || 'unknown'
          });
          processedCount++;
        } else {
          console.warn(`⚠️  Invalid metadata in file ${file.filename}:`, {
            hasTitle: !!metadata.title,
            hasUrl: !!metadata.url,
            hasExtractedAt: !!metadata.extractedAt
          });
          errorCount++;
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse metadata file ${file.filename}:`, parseError.message);
        errorCount++;
      }
    }

    // Sort articles by extraction date (newest first)
    articles.sort((a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime());

    console.log(`✅ Article search completed: ${processedCount} articles processed, ${errorCount} errors`);

    res.json({
      success: true,
      articles,
      statistics: {
        totalFiles: metadataFiles.length,
        processedArticles: processedCount,
        errorFiles: errorCount
      }
    });

  } catch (error) {
    console.error('Article search error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'WebDAV authentication failed. Please check your credentials.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'WebDAV server or directory not found. Please check your URL.';
    } else if (error.message.includes('connection') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Could not connect to WebDAV server. Please check your URL and network connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'WebDAV request timed out. Please try again.';
    }
    
    res.status(500).json({ 
      error: 'Failed to search articles',
      details: errorMessage 
    });
  }
});

// Get article statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    console.log(`📊 Getting article statistics for user: ${user.username}`);

    // Ensure URL format is correct
    let webdavUrl = user.webdavUrl;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const client = createClient(webdavUrl, {
      username: user.webdavUsername,
      password: user.webdavPassword,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    const metadataDir = `${baseDir}/metadata`;
    
    // Get all metadata files
    let files;
    try {
      files = await client.getDirectoryContents(metadataDir, { deep: true });
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return res.json({
          success: true,
          statistics: {
            totalArticles: 0,
            totalWords: 0,
            totalImages: 0,
            uniqueDomains: 0,
            uniqueTags: 0,
            extractionMethods: {},
            dateRange: null
          }
        });
      }
      throw error;
    }
    
    // Filter for JSON metadata files
    const metadataFiles = files.filter(file => 
      file.type === 'file' && file.filename.endsWith('.json')
    );

    // Process statistics
    let totalWords = 0;
    let totalImages = 0;
    const domains = new Set();
    const tags = new Set();
    const extractionMethods = {};
    const dates = [];

    for (const file of metadataFiles) {
      try {
        const content = await client.getFileContents(file.filename, { format: 'text' });
        const metadata = JSON.parse(content);
        
        if (metadata.wordCount) totalWords += metadata.wordCount;
        if (metadata.imageCount) totalImages += metadata.imageCount;
        if (metadata.domain) domains.add(metadata.domain);
        if (metadata.extractedAt) dates.push(new Date(metadata.extractedAt));
        
        // Collect tags
        if (metadata.tags) metadata.tags.forEach(tag => tags.add(tag));
        if (metadata.userTags) metadata.userTags.forEach(tag => tags.add(tag));
        
        // Count extraction methods
        const method = metadata.extractionMethod || 'unknown';
        extractionMethods[method] = (extractionMethods[method] || 0) + 1;
        
      } catch (parseError) {
        // Skip invalid files
      }
    }

    // Calculate date range
    let dateRange = null;
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      dateRange = {
        earliest: dates[0].toISOString(),
        latest: dates[dates.length - 1].toISOString()
      };
    }

    const statistics = {
      totalArticles: metadataFiles.length,
      totalWords,
      totalImages,
      uniqueDomains: domains.size,
      uniqueTags: tags.size,
      extractionMethods,
      dateRange
    };

    console.log(`📊 Statistics calculated:`, statistics);

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Article statistics error:', error);
    res.status(500).json({ 
      error: 'Failed to get article statistics',
      details: error.message 
    });
  }
});

export default router;