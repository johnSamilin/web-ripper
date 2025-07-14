import * as cheerio from 'cheerio';
import { monolithExtractor } from './monolithExtractor.js';
import { generateHTMLWithInlineImages } from './htmlGenerator.js';

// Unified content extraction service that supports multiple extraction methods
export class ExtractionService {
  constructor() {
    this.extractionMode = process.env.EXTRACTION_MODE || 'cheerio';
    this.supportedModes = ['cheerio', 'monolith'];
  }

  // Get current extraction mode and availability
  async getExtractionInfo() {
    const info = {
      currentMode: this.extractionMode,
      supportedModes: this.supportedModes,
      modes: {}
    };

    // Check Cheerio availability (always available)
    info.modes.cheerio = {
      available: true,
      description: 'Built-in JavaScript extraction using Cheerio',
      features: ['Fast', 'Lightweight', 'Good for simple sites'],
      performance: 'High'
    };

    // Check Monolith availability
    const monolithInfo = await monolithExtractor.getInfo();
    info.modes.monolith = {
      available: monolithInfo.available,
      description: 'External monolith tool for comprehensive extraction',
      features: ['Complete page preservation', 'Better for complex sites', 'Self-contained output'],
      performance: 'Medium',
      version: monolithInfo.version,
      error: monolithInfo.error,
      path: monolithInfo.path
    };

    return info;
  }

  // Enhanced content extraction function using Cheerio
  extractMainContentCheerio($, url) {
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

  // Extract content using Cheerio method
  async extractWithCheerio(url, html) {
    console.log(`🔧 Extracting content using Cheerio: ${url}`);
    
    const $ = cheerio.load(html);
    
    // Extract metadata
    const title = $('title').text().trim() || 
                 $('h1').first().text().trim() || 
                 'Untitled';
    
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';
    
    // Extract main content
    const mainContent = this.extractMainContentCheerio($, url);
    const content = mainContent.html() || '';
    
    // Calculate word count
    const textContent = mainContent.text() || '';
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    
    // Count images
    const imageCount = mainContent.find('img').length;
    
    console.log(`✅ Cheerio extraction completed: ${title} (${wordCount} words, ${imageCount} images)`);
    
    return {
      success: true,
      title,
      description,
      content,
      wordCount,
      imageCount,
      url,
      extractionMethod: 'cheerio'
    };
  }

  // Main extraction method that routes to appropriate extractor
  async extractContent(url, html) {
    try {
      let extractionResult;

      // Route to appropriate extraction method
      switch (this.extractionMode) {
        case 'monolith':
          // Check if monolith is available
          const isMonolithAvailable = await monolithExtractor.isAvailable();
          if (!isMonolithAvailable) {
            console.warn('⚠️  Monolith not available, falling back to Cheerio');
            extractionResult = await this.extractWithCheerio(url, html);
          } else {
            try {
              extractionResult = await monolithExtractor.extractFromUrl(url);
            } catch (monolithError) {
              console.warn('⚠️  Monolith extraction failed, falling back to Cheerio:', monolithError.message);
              extractionResult = await this.extractWithCheerio(url, html);
            }
          }
          break;

        case 'cheerio':
        default:
          extractionResult = await this.extractWithCheerio(url, html);
          break;
      }

      return extractionResult;

    } catch (error) {
      console.error('❌ Content extraction failed:', error);
      throw new Error(`Content extraction failed: ${error.message}`);
    }
  }

  // Process extracted content into final HTML format
  async processExtractedContent(extractionResult, metadata = {}) {
    try {
      console.log(`🎨 Processing extracted content with ${extractionResult.extractionMethod}`);

      // For monolith results, we already have complete HTML
      if (extractionResult.extractionMethod === 'monolith') {
        return {
          html: extractionResult.html,
          wordCount: extractionResult.wordCount,
          imageCount: extractionResult.imageCount,
          title: extractionResult.title,
          description: extractionResult.description,
          extractionMethod: 'monolith'
        };
      }

      // For cheerio results, generate HTML with inline images
      const htmlResult = await generateHTMLWithInlineImages(
        extractionResult.content,
        extractionResult.url,
        extractionResult.title,
        extractionResult.description,
        extractionResult.url,
        {
          ...metadata,
          extractionMethod: extractionResult.extractionMethod
        }
      );

      return {
        ...htmlResult,
        title: extractionResult.title,
        description: extractionResult.description,
        extractionMethod: extractionResult.extractionMethod
      };

    } catch (error) {
      console.error('❌ Content processing failed:', error);
      throw new Error(`Content processing failed: ${error.message}`);
    }
  }

  // Set extraction mode dynamically
  setExtractionMode(mode) {
    if (!this.supportedModes.includes(mode)) {
      throw new Error(`Unsupported extraction mode: ${mode}. Supported modes: ${this.supportedModes.join(', ')}`);
    }
    this.extractionMode = mode;
    console.log(`🔧 Extraction mode changed to: ${mode}`);
  }

  // Get current extraction mode
  getExtractionMode() {
    return this.extractionMode;
  }
}

// Create singleton instance
export const extractionService = new ExtractionService();

// Export for testing
export default ExtractionService;