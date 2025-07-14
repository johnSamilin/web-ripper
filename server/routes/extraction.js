import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { extractionService } from '../services/extractionService.js';

const router = express.Router();

// Get extraction information and available modes
router.get('/info', async (req, res) => {
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

// Set extraction mode (authenticated users only)
router.post('/mode', authenticateToken, async (req, res) => {
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

// Get current extraction mode
router.get('/mode', async (req, res) => {
  try {
    const currentMode = extractionService.getExtractionMode();
    const info = await extractionService.getExtractionInfo();
    
    res.json({
      success: true,
      currentMode,
      availableModes: info.supportedModes,
      modeInfo: info.modes
    });
  } catch (error) {
    console.error('Get extraction mode error:', error);
    res.status(500).json({ 
      error: 'Failed to get extraction mode',
      details: error.message 
    });
  }
});

export default router;