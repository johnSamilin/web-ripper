import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { testWebDAVConnection, listWebDAVFiles } from '../services/webdav.js';

const router = express.Router();

// Get WebDAV settings
router.get('/settings/webdav', authenticateToken, async (req, res) => {
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

// Update WebDAV settings
router.post('/settings/webdav', authenticateToken, async (req, res) => {
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

// Test WebDAV connection
router.post('/settings/webdav/test', authenticateToken, async (req, res) => {
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

// List WebDAV files
router.get('/webdav/files', authenticateToken, async (req, res) => {
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

export default router;