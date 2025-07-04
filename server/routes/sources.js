import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createClient } from 'webdav';

const router = express.Router();

// Get user's ignore list from WebDAV
const getIgnoreListFromWebDAV = async (webdavConfig) => {
  try {
    const { url, username, password } = webdavConfig;
    
    // Ensure URL format is correct
    let webdavUrl = url;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const client = createClient(webdavUrl, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    const ignoreListPath = `${baseDir}/source-ignore-list.json`;
    
    try {
      const content = await client.getFileContents(ignoreListPath, { format: 'text' });
      const data = JSON.parse(content);
      return data.ignoredSources || [];
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        // File doesn't exist yet, return empty array
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting ignore list from WebDAV:', error);
    throw new Error(`Failed to get ignore list: ${error.message}`);
  }
};

// Save user's ignore list to WebDAV
const saveIgnoreListToWebDAV = async (webdavConfig, ignoredSources) => {
  try {
    const { url, username, password } = webdavConfig;
    
    // Ensure URL format is correct
    let webdavUrl = url;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const client = createClient(webdavUrl, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    
    // Ensure base directory exists
    try {
      const dirExists = await client.exists(baseDir);
      if (!dirExists) {
        await client.createDirectory(baseDir);
      }
    } catch (error) {
      // Directory might already exist
    }

    const ignoreListPath = `${baseDir}/source-ignore-list.json`;
    const data = {
      ignoredSources,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
    
    await client.putFileContents(ignoreListPath, JSON.stringify(data, null, 2), {
      overwrite: true,
      contentType: 'application/json'
    });

    console.log(`✅ Ignore list saved to WebDAV: ${ignoredSources.length} sources`);
    return true;
  } catch (error) {
    console.error('Error saving ignore list to WebDAV:', error);
    throw new Error(`Failed to save ignore list: ${error.message}`);
  }
};

// Get ignore list
router.get('/sources/ignore-list', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    const ignoredSources = await getIgnoreListFromWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    res.json({
      success: true,
      ignoredSources
    });
  } catch (error) {
    console.error('Get ignore list error:', error);
    res.status(500).json({ 
      error: 'Failed to get ignore list',
      details: error.message 
    });
  }
});

// Add or remove source from ignore list
router.post('/sources/ignore', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { domain, action } = req.body; // action: 'add' or 'remove'
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    if (!domain || !action) {
      return res.status(400).json({ error: 'Domain and action are required' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "add" or "remove"' });
    }

    // Get current ignore list
    let ignoredSources = await getIgnoreListFromWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    // Update the list
    if (action === 'add') {
      if (!ignoredSources.includes(domain)) {
        ignoredSources.push(domain);
        console.log(`🚫 Added ${domain} to ignore list for user: ${user.username}`);
      }
    } else if (action === 'remove') {
      ignoredSources = ignoredSources.filter(d => d !== domain);
      console.log(`✅ Removed ${domain} from ignore list for user: ${user.username}`);
    }

    // Save updated list
    await saveIgnoreListToWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    }, ignoredSources);

    res.json({
      success: true,
      message: `Source ${action === 'add' ? 'added to' : 'removed from'} ignore list`,
      ignoredSources
    });
  } catch (error) {
    console.error('Update ignore list error:', error);
    res.status(500).json({ 
      error: 'Failed to update ignore list',
      details: error.message 
    });
  }
});

// Clear entire ignore list
router.delete('/sources/ignore-list', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    // Save empty list
    await saveIgnoreListToWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    }, []);

    console.log(`🧹 Cleared ignore list for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Ignore list cleared',
      ignoredSources: []
    });
  } catch (error) {
    console.error('Clear ignore list error:', error);
    res.status(500).json({ 
      error: 'Failed to clear ignore list',
      details: error.message 
    });
  }
});

// Get ignore list statistics
router.get('/sources/ignore-stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    const ignoredSources = await getIgnoreListFromWebDAV({
      url: user.webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    res.json({
      success: true,
      statistics: {
        totalIgnored: ignoredSources.length,
        ignoredSources: ignoredSources
      }
    });
  } catch (error) {
    console.error('Get ignore stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get ignore statistics',
      details: error.message 
    });
  }
});

export default router;