import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ACME Challenge route for Let's Encrypt
router.get('/.well-known/acme-challenge/:token', (req, res) => {
  const token = req.params.token;
  
  // Validate token format (basic security check)
  if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
    console.log(`❌ Invalid ACME challenge token format: ${token}`);
    return res.status(400).send('Invalid token format');
  }
  
  const challengePath = path.join(process.cwd(), '.well-known', 'acme-challenge', token);
  
  console.log(`🔍 ACME challenge request for token: ${token}`);
  console.log(`📁 Looking for file: ${challengePath}`);
  
  // Check if challenge file exists
  if (fs.existsSync(challengePath)) {
    try {
      const challengeResponse = fs.readFileSync(challengePath, 'utf8');
      console.log(`✅ ACME challenge file found, serving response`);
      
      // Set proper headers for ACME challenge
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(challengeResponse);
    } catch (error) {
      console.error(`❌ Error reading ACME challenge file: ${error.message}`);
      res.status(500).send('Error reading challenge file');
    }
  } else {
    console.log(`❌ ACME challenge file not found: ${challengePath}`);
    res.status(404).send('Challenge not found');
  }
});

// Health check for ACME challenges
router.get('/.well-known/acme-challenge/', (req, res) => {
  console.log(`🔍 ACME challenge directory access`);
  res.setHeader('Content-Type', 'text/plain');
  res.send('ACME challenge endpoint ready');
});

export default router;