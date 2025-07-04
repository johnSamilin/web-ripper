import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { cleanupCSSInFiles } from '../scripts/cleanupCSS.js';

const router = express.Router();

// CSS cleanup endpoint for authenticated users
router.post('/cleanup-css', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    console.log(`🧹 Starting CSS cleanup for user: ${user.username}`);
    console.log(`🔗 WebDAV URL: ${user.webdavUrl}`);
    console.log(`👤 Username: ${user.webdavUsername}`);

    // Validate WebDAV URL format
    let webdavUrl = user.webdavUrl;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const result = await cleanupCSSInFiles({
      url: webdavUrl,
      username: user.webdavUsername,
      password: user.webdavPassword
    });

    res.json({
      success: true,
      message: 'CSS cleanup completed successfully',
      statistics: {
        totalFiles: result.totalFiles,
        processedFiles: result.processedFiles,
        errorFiles: result.errorFiles,
        backupFiles: result.backupFiles || result.processedFiles
      }
    });
  } catch (error) {
    console.error('CSS cleanup error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'CSS cleanup failed';
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'WebDAV authentication failed. Please check your credentials.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'WebDAV server or directory not found. Please check your URL.';
    } else if (error.message.includes('connection')) {
      errorMessage = 'Could not connect to WebDAV server. Please check your URL and network connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'WebDAV request timed out. Please try again.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
});

// Get cleanup status/statistics
router.get('/cleanup-status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.webdavUrl || !user.webdavUsername || !user.webdavPassword) {
      return res.status(400).json({ error: 'WebDAV not configured' });
    }

    // This could be enhanced to check for backup files and provide status
    res.json({
      success: true,
      webdavConfigured: true,
      message: 'CSS cleanup is available for your saved articles'
    });
  } catch (error) {
    console.error('Cleanup status error:', error);
    res.status(500).json({ 
      error: 'Failed to get cleanup status',
      details: error.message 
    });
  }
});

export default router;