import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { JSDOM } from 'jsdom';

// Monolith-based content extraction service
export class MonolithExtractor {
  constructor(options = {}) {
    this.monolithPath = options.monolithPath || process.env.MONOLITH_PATH || 'monolith';
    this.timeout = parseInt(options.timeout || process.env.MONOLITH_TIMEOUT || '60000');
    this.userAgent = options.userAgent || process.env.MONOLITH_USER_AGENT || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  // Check if monolith is available
  async isAvailable() {
    try {
      const result = await this.runMonolith(['--version']);
      return result.success && result.stdout.includes('monolith');
    } catch (error) {
      console.warn('⚠️  Monolith not available:', error.message);
      return false;
    }
  }

  // Run monolith command with proper error handling
  async runMonolith(args, input = null) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.monolithPath, args, {
        stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timer = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error(`Monolith process timed out after ${this.timeout}ms`));
      }, this.timeout);

      process.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code
          });
        } else {
          reject(new Error(`Monolith process failed with code ${code}: ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start monolith process: ${error.message}`));
      });

      // Send input if provided
      if (input && process.stdin) {
        process.stdin.write(input);
        process.stdin.end();
      }
    });
  }

  // Extract content from URL using monolith
  async extractFromUrl(url) {
    try {
      console.log(`🔧 Extracting content using Monolith: ${url}`);

      // Validate URL
      const validUrl = new URL(url);
      
      // Build monolith arguments
      const args = [
        '--isolate',           // Isolate the document
        '--no-css',           // Remove CSS (we'll add our own clean styling)
        '--no-fonts',         // Remove font declarations
        '--no-frames',        // Remove frames and iframes
        '--no-js',            // Remove JavaScript
        '--no-metadata',      // Remove metadata
        '--no-audio',         // Remove audio elements
        '--no-video',         // Remove video elements
        '--silent',           // Suppress progress messages
        '--user-agent', this.userAgent,
        validUrl.href
      ];

      console.log(`🚀 Running monolith with args:`, args.slice(0, -1).join(' '), '[URL]');

      const result = await this.runMonolith(args);
      
      if (!result.success || !result.stdout) {
        throw new Error('Monolith returned empty content');
      }

      console.log(`✅ Monolith extraction completed: ${Math.round(result.stdout.length / 1024)}KB`);

      // Parse the HTML to extract metadata and clean content
      const parsed = this.parseMonolithOutput(result.stdout, validUrl.href);
      
      return {
        success: true,
        html: result.stdout,
        title: parsed.title,
        description: parsed.description,
        content: parsed.content,
        wordCount: parsed.wordCount,
        imageCount: parsed.imageCount,
        url: validUrl.href,
        extractionMethod: 'monolith'
      };

    } catch (error) {
      console.error('❌ Monolith extraction failed:', error);
      throw new Error(`Monolith extraction failed: ${error.message}`);
    }
  }

  // Parse monolith output to extract metadata and content
  parseMonolithOutput(html, url) {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract title
      const title = document.querySelector('title')?.textContent?.trim() || 
                   document.querySelector('h1')?.textContent?.trim() || 
                   'Untitled Article';

      // Extract description
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                         '';

      // Extract main content (monolith preserves the full page, so we need to find the main content)
      let content = '';
      const mainElement = document.querySelector('main') || 
                         document.querySelector('article') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('.main-content') ||
                         document.querySelector('.post-content') ||
                         document.querySelector('.entry-content') ||
                         document.querySelector('.article-content') ||
                         document.querySelector('.content') ||
                         document.querySelector('#content');

      if (mainElement) {
        content = mainElement.innerHTML;
      } else {
        // Fallback: remove header, nav, footer, sidebar elements
        const elementsToRemove = document.querySelectorAll('header, nav, footer, aside, .sidebar, .navigation, .menu, .ads, .advertisement');
        elementsToRemove.forEach(el => el.remove());
        content = document.body.innerHTML;
      }

      // Calculate word count
      const textContent = document.body.textContent || '';
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

      // Count images
      const imageCount = document.querySelectorAll('img').length;

      console.log(`📊 Parsed content: ${title} (${wordCount} words, ${imageCount} images)`);

      return {
        title,
        description,
        content,
        wordCount,
        imageCount
      };

    } catch (error) {
      console.error('❌ Failed to parse monolith output:', error);
      throw new Error(`Failed to parse monolith output: ${error.message}`);
    }
  }

  // Extract content from HTML string using monolith (for processing existing HTML)
  async extractFromHtml(html, baseUrl = '') {
    try {
      console.log(`🔧 Processing HTML content using Monolith (${Math.round(html.length / 1024)}KB)`);

      // Create temporary file for HTML input
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `monolith-input-${Date.now()}.html`);
      
      try {
        await fs.writeFile(tempFile, html, 'utf8');

        // Build monolith arguments for file input
        const args = [
          '--isolate',
          '--no-css',
          '--no-fonts',
          '--no-frames',
          '--no-js',
          '--no-metadata',
          '--no-audio',
          '--no-video',
          '--silent',
          '--user-agent', this.userAgent
        ];

        // Add base URL if provided
        if (baseUrl) {
          args.push('--base-url', baseUrl);
        }

        args.push(tempFile);

        const result = await this.runMonolith(args);
        
        if (!result.success || !result.stdout) {
          throw new Error('Monolith returned empty content');
        }

        console.log(`✅ Monolith HTML processing completed`);

        // Parse the result
        const parsed = this.parseMonolithOutput(result.stdout, baseUrl);
        
        return {
          success: true,
          html: result.stdout,
          title: parsed.title,
          description: parsed.description,
          content: parsed.content,
          wordCount: parsed.wordCount,
          imageCount: parsed.imageCount,
          extractionMethod: 'monolith'
        };

      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempFile);
        } catch (cleanupError) {
          console.warn('⚠️  Failed to cleanup temp file:', cleanupError.message);
        }
      }

    } catch (error) {
      console.error('❌ Monolith HTML processing failed:', error);
      throw new Error(`Monolith HTML processing failed: ${error.message}`);
    }
  }

  // Get monolith version and capabilities
  async getInfo() {
    try {
      const versionResult = await this.runMonolith(['--version']);
      const helpResult = await this.runMonolith(['--help']);
      
      return {
        available: true,
        version: versionResult.stdout,
        capabilities: helpResult.stdout,
        path: this.monolithPath
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        path: this.monolithPath
      };
    }
  }
}

// Create singleton instance
export const monolithExtractor = new MonolithExtractor();

// Export for testing
export default MonolithExtractor;