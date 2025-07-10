import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeSourcesFromWebDAV, analyzeSingleSource } from '../services/sourceAnalyzer.js';

const router = express.Router();

// Get source analysis
router.get('/analyze/sources', authenticateToken, async (req, res) => {
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

// Analyze all sources for feeds
router.post('/analyze/sources/feeds', authenticateToken, async (req, res) => {
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

// Analyze single source for feeds
router.post('/analyze/sources/feeds/:domain', authenticateToken, async (req, res) => {
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

export default router;