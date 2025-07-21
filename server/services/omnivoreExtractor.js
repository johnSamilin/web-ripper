import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Mozilla Readability-based content extraction service
export class ReadabilityExtractor {
  constructor(options = {}) {
    this.timeout = parseInt(options.timeout || process.env.READABILITY_TIMEOUT || '30000');
    this.minContentLength = parseInt(options.minContentLength || process.env.READABILITY_MIN_CONTENT_LENGTH || '140');
    this.minScore = parseFloat(options.minScore || process.env.READABILITY_MIN_SCORE || '20');
    this.charThreshold = parseInt(options.charThreshold || process.env.READABILITY_CHAR_THRESHOLD || '500');
  }

  // Check if Mozilla Readability is available (it's always available since it's a JS library)
  async isAvailable() {
    try {
      // Test if we can create a Readability instance
      const testDom = new JSDOM('<html><body><p>test</p></body></html>');
      new Readability(testDom.window.document);
      return true;
    } catch (error) {
      console.warn('⚠️  Mozilla Readability not available:', error.message);
      return false;
    }
  }

  // Extract content from HTML using Mozilla Readability
  async extractFromHtml(html, url = '') {
    try {
      console.log(`🔧 Extracting content using Mozilla Readability: ${url || 'HTML content'}`);

      if (!html || html.trim().length === 0) {
        throw new Error('Empty HTML content provided');
      }

      // Create DOM from HTML
      const dom = new JSDOM(html, {
        url: url || 'https://example.com',
        contentType: 'text/html',
        includeNodeLocations: false,
        storageQuota: 10000000
      });

      const document = dom.window.document;

      // Pre-process the document to improve extraction
      this.preprocessDocument(document);

      // Create Readability instance with custom options
      const reader = new Readability(document, {
        debug: process.env.NODE_ENV === 'development',
        maxElemsToParse: 0, // No limit
        nbTopCandidates: 5,
        charThreshold: this.charThreshold,
        classesToPreserve: ['highlight', 'code', 'pre', 'blockquote', 'caption'],
        keepClasses: true
      });

      // Check if the document is parseable
      if (!reader.isProbablyReaderable()) {
        console.warn('⚠️  Document may not be suitable for content extraction');
      }

      // Parse the content
      const article = reader.parse();

      if (!article) {
        throw new Error('Mozilla Readability failed to extract readable content from the document');
      }

      // Validate extracted content
      if (!article.content || article.content.trim().length < this.minContentLength) {
        throw new Error(`Extracted content too short (${article.content?.length || 0} chars, minimum ${this.minContentLength})`);
      }

      // Post-process the extracted content
      const processedContent = this.postprocessContent(article.content, url);

      // Calculate additional metrics
      const textContent = this.extractTextContent(processedContent);
      const wordCount = this.calculateWordCount(textContent);
      const imageCount = this.countImages(processedContent);

      console.log(`✅ Mozilla Readability extraction completed: ${article.title} (${wordCount} words, ${imageCount} images)`);

      return {
        success: true,
        title: article.title || this.extractTitleFromHtml(html) || 'Untitled',
        description: article.excerpt || this.extractDescriptionFromHtml(html) || '',
        content: processedContent,
        textContent: textContent,
        wordCount: wordCount,
        imageCount: imageCount,
        url: url,
        extractionMethod: 'readability',
        readingTime: Math.ceil(wordCount / 200), // Assume 200 WPM
        author: article.byline || '',
        siteName: article.siteName || '',
        publishedTime: article.publishedTime || '',
        score: article.score || 0
      };

    } catch (error) {
      console.error('❌ Mozilla Readability extraction failed:', error);
      throw new Error(`Mozilla Readability extraction failed: ${error.message}`);
    }
  }

  // Extract content from URL (fetch HTML first, then extract)
  async extractFromUrl(url) {
    try {
      console.log(`🔧 Fetching and extracting content using Mozilla Readability: ${url}`);

      // Import fetch dynamically to avoid issues
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return await this.extractFromHtml(html, url);

    } catch (error) {
      console.error('❌ Mozilla Readability URL extraction failed:', error);
      throw new Error(`Mozilla Readability URL extraction failed: ${error.message}`);
    }
  }

  // Pre-process document to improve Readability extraction quality
  preprocessDocument(document) {
    try {
      // Remove unwanted elements that might interfere with extraction
      const unwantedSelectors = [
        'script[src*="analytics"]',
        'script[src*="tracking"]',
        'script[src*="ads"]',
        '.advertisement',
        '.ads',
        '.social-share',
        '.newsletter-signup',
        '.popup',
        '.modal',
        '.cookie-banner',
        '[data-ad]',
        '[class*="ad-"]',
        '[id*="ad-"]'
      ];

      unwantedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // Enhance content markers for better extraction
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.main-content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content'
      ];

      contentSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.setAttribute('data-readability-content', 'true');
        });
      });

      console.log('📝 Document preprocessed for Mozilla Readability extraction');

    } catch (error) {
      console.warn('⚠️  Document preprocessing failed:', error.message);
    }
  }

  // Post-process extracted content
  postprocessContent(content, url = '') {
    try {
      // Create a DOM for post-processing
      const dom = new JSDOM(content);
      const document = dom.window.document;

      // Fix relative URLs
      if (url) {
        const baseUrl = new URL(url);
        
        // Fix image sources
        const images = document.querySelectorAll('img[src]');
        images.forEach(img => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              const absoluteUrl = new URL(src, baseUrl).href;
              img.setAttribute('src', absoluteUrl);
            } catch (e) {
              console.warn('⚠️  Failed to resolve image URL:', src);
            }
          }
        });

        // Fix link hrefs
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
            try {
              const absoluteUrl = new URL(href, baseUrl).href;
              link.setAttribute('href', absoluteUrl);
            } catch (e) {
              console.warn('⚠️  Failed to resolve link URL:', href);
            }
          }
        });
      }

      // Clean up empty elements
      const emptyElements = document.querySelectorAll('p:empty, div:empty, span:empty');
      emptyElements.forEach(el => el.remove());

      // Preserve code blocks and pre-formatted text
      const codeBlocks = document.querySelectorAll('pre, code');
      codeBlocks.forEach(block => {
        block.setAttribute('data-preserve-formatting', 'true');
      });

      return document.body.innerHTML;

    } catch (error) {
      console.warn('⚠️  Content post-processing failed:', error.message);
      return content;
    }
  }

  // Extract plain text content
  extractTextContent(html) {
    try {
      const dom = new JSDOM(html);
      return dom.window.document.body.textContent || '';
    } catch (error) {
      return '';
    }
  }

  // Calculate word count
  calculateWordCount(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Count images in content
  countImages(html) {
    try {
      const dom = new JSDOM(html);
      return dom.window.document.querySelectorAll('img').length;
    } catch (error) {
      return 0;
    }
  }

  // Extract title from HTML if not provided by Readability
  extractTitleFromHtml(html) {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      return document.querySelector('title')?.textContent?.trim() ||
             document.querySelector('h1')?.textContent?.trim() ||
             document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
             '';
    } catch (error) {
      return '';
    }
  }

  // Extract description from HTML if not provided by Readability
  extractDescriptionFromHtml(html) {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      return document.querySelector('meta[name="description"]')?.getAttribute('content') ||
             document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
             '';
    } catch (error) {
      return '';
    }
  }

  // Get Mozilla Readability version and capabilities
  async getInfo() {
    try {
      const packageInfo = await import('@mozilla/readability/package.json', { assert: { type: 'json' } });
      
      return {
        available: true,
        version: packageInfo.default.version || 'Unknown',
        capabilities: [
          'Advanced content extraction',
          'Readability scoring',
          'Author and metadata extraction',
          'Reading time estimation',
          'Content quality assessment'
        ],
        library: '@mozilla/readability'
      };
    } catch (error) {
      return {
        available: await this.isAvailable(),
        error: error.message,
        library: '@mozilla/readability'
      };
    }
  }
}

// Create singleton instance
export const readabilityExtractor = new ReadabilityExtractor();

// Export for testing
export default ReadabilityExtractor;