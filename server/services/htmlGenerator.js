import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import mime from 'mime-types';

// Convert image to base64 data URL
const imageToDataURL = async (imageUrl, baseUrl) => {
  try {
    // Handle relative URLs
    const absoluteUrl = new URL(imageUrl, baseUrl).href;
    
    console.log(`📸 Downloading image: ${absoluteUrl}`);
    
    const response = await fetch(absoluteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to download image: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`⚠️  Invalid image content type: ${contentType}`);
      return null;
    }

    // Check file size (limit to 5MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      console.warn(`⚠️  Image too large: ${contentLength} bytes`);
      return null;
    }

    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log(`✅ Image inlined: ${Math.round(buffer.length / 1024)}KB`);
    return dataUrl;
  } catch (error) {
    console.warn(`⚠️  Failed to inline image ${imageUrl}:`, error.message);
    return null;
  }
};

// Remove layout CSS but preserve text styling
const removeLayoutCSS = (htmlContent) => {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Remove external stylesheets and most style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
      // Keep inline styles that might contain important text formatting
      const styleContent = tag.textContent || '';
      if (!styleContent.includes('font') && 
          !styleContent.includes('line-height') && 
          !styleContent.includes('letter-spacing') &&
          !styleContent.includes('text-')) {
        tag.remove();
      }
    });
    
    // Remove external stylesheets
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(tag => tag.remove());
    
    // Process inline style attributes - keep text styling, remove layout
    const elementsWithStyle = document.querySelectorAll('[style]');
    elementsWithStyle.forEach(element => {
      const style = element.getAttribute('style');
      if (style) {
        // Extract text-related CSS properties
        const textStyles = [];
        const styleRules = style.split(';').map(rule => rule.trim()).filter(rule => rule);
        
        styleRules.forEach(rule => {
          const [property, value] = rule.split(':').map(part => part.trim());
          if (property && value) {
            // Keep text-related properties
            if (property.match(/^(font|line-height|letter-spacing|text-align|text-decoration|text-transform|color|font-weight|font-style|font-size|font-family)$/)) {
              textStyles.push(`${property}: ${value}`);
            }
          }
        });
        
        // Update style attribute with only text styles
        if (textStyles.length > 0) {
          element.setAttribute('style', textStyles.join('; '));
        } else {
          element.removeAttribute('style');
        }
      }
    });
    
    // Remove CSS class attributes (but keep semantic classes if any)
    const elementsWithClass = document.querySelectorAll('[class]');
    elementsWithClass.forEach(element => {
      const className = element.getAttribute('class');
      // Keep semantic classes that might be important for content structure
      if (className && !className.match(/^(layout|grid|flex|container|wrapper|sidebar|nav|menu|header|footer|ads?|banner|popup)/i)) {
        // Keep the class if it seems semantic rather than layout-related
        const semanticClasses = className.split(' ').filter(cls => 
          cls.match(/^(article|content|text|paragraph|quote|code|highlight|emphasis|title|subtitle|caption|author|date|tag|category)$/i)
        );
        if (semanticClasses.length > 0) {
          element.setAttribute('class', semanticClasses.join(' '));
        } else {
          element.removeAttribute('class');
        }
      } else {
        element.removeAttribute('class');
      }
    });
    
    // Remove other CSS-related attributes
    // Remove layout-related data attributes but keep content-related ones
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      // Remove id attributes (optional - uncomment if you want to remove all IDs)
        // Remove layout-related data attributes
        if (attr.name.startsWith('data-') && 
            (attr.name.includes('layout') || 
             attr.name.includes('grid') || 
             attr.name.includes('flex') ||
             attr.name.includes('position') ||
             attr.name.includes('margin') ||
             attr.name.includes('padding'))) {
             attr.name.includes('class') || 
             attr.name.includes('css'))) {
          element.removeAttribute(attr.name);
        }
      });
    });
    
    console.log(`🎨 Layout CSS removed, text styling preserved: ${styleTags.length} style tags processed, ${linkTags.length} stylesheets removed, ${elementsWithStyle.length} inline styles processed`);
    
    return document.body.innerHTML;
  } catch (error) {
    console.error('Error processing CSS:', error);
    return htmlContent; // Return original if cleaning fails
  }
};

// Generate plain HTML template without any CSS
const generatePlainHTMLTemplate = (title, description, url, content, metadata = {}) => {
  const extractedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="generator" content="Web Ripper">
    <meta name="extracted-date" content="${new Date().toISOString()}">
    <meta name="source-url" content="${url}">
    ${metadata.tags ? `<meta name="keywords" content="${metadata.tags.join(', ')}">` : ''}
    <style>
        /* Preserve text styling while keeping layout clean */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        
        /* Preserve heading hierarchy */
        h1 { font-size: 2.5em; line-height: 1.2; margin: 0.67em 0; font-weight: bold; }
        h2 { font-size: 2em; line-height: 1.3; margin: 0.75em 0; font-weight: bold; }
        h3 { font-size: 1.5em; line-height: 1.4; margin: 0.83em 0; font-weight: bold; }
        h4 { font-size: 1.25em; line-height: 1.4; margin: 1em 0; font-weight: bold; }
        h5 { font-size: 1.1em; line-height: 1.5; margin: 1.33em 0; font-weight: bold; }
        h6 { font-size: 1em; line-height: 1.5; margin: 1.67em 0; font-weight: bold; }
        
        /* Preserve text formatting */
        p { margin: 1em 0; line-height: 1.6; }
        blockquote { 
            margin: 1em 0; 
            padding: 0 1em; 
            border-left: 4px solid #ddd; 
            font-style: italic; 
            color: #666;
        }
        
        /* Preserve code styling */
        code { 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
            background: #f5f5f5; 
            padding: 2px 4px; 
            border-radius: 3px;
            font-size: 0.9em;
        }
        pre { 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
            background: #f5f5f5; 
            padding: 1em; 
            border-radius: 5px; 
            overflow-x: auto;
            line-height: 1.4;
        }
        pre code { background: none; padding: 0; }
        
        /* Preserve emphasis */
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        u { text-decoration: underline; }
        s, strike, del { text-decoration: line-through; }
        
        /* Preserve lists */
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin: 0.5em 0; line-height: 1.6; }
        
        /* Preserve links */
        a { color: #0066cc; text-decoration: underline; }
        a:hover { color: #004499; }
        
        /* Preserve tables */
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        
        /* Preserve images */
        img { max-width: 100%; height: auto; margin: 1em 0; }
        
        /* Header and footer styling */
        header { border-bottom: 2px solid #eee; margin-bottom: 2em; padding-bottom: 1em; }
        footer { border-top: 2px solid #eee; margin-top: 2em; padding-top: 1em; color: #666; font-size: 0.9em; }
        
        /* Preserve small text */
        small { font-size: 0.8em; }
        sub { font-size: 0.8em; vertical-align: sub; }
        sup { font-size: 0.8em; vertical-align: super; }
        
        /* Preserve quotes */
        q:before { content: '"'; }
        q:after { content: '"'; }
        
        /* Preserve abbreviations */
        abbr[title] { border-bottom: 1px dotted; cursor: help; }
    </style>
</head>
<body>
    <article>
        <header>
            <h1>${title}</h1>
            
            ${description ? `<blockquote>${description}</blockquote>` : ''}
            
            <p>
                <strong>Source:</strong> <a href="${url}" target="_blank">${new URL(url).hostname}</a><br>
                <strong>Extracted:</strong> ${extractedDate}
                ${metadata.extractedBy ? `<br><strong>By:</strong> ${metadata.extractedBy}` : ''}
                ${metadata.wordCount ? `<br><strong>Words:</strong> ${metadata.wordCount.toLocaleString()}` : ''}
                ${metadata.imageCount ? `<br><strong>Images:</strong> ${metadata.imageCount}` : ''}
            </p>
            
            ${metadata.tags && metadata.tags.length > 0 ? `
            <p>
                <strong>Tags:</strong> ${metadata.tags.join(', ')}
            </p>
            ` : ''}
            
            <hr>
        </header>
        
        <main>
            ${content}
        </main>
        
        <footer>
            <hr>
            <p>
                <strong>Extracted by Web Ripper</strong><br>
                Original URL: <a href="${url}" target="_blank">${url}</a><br>
                Extraction Date: ${new Date().toISOString()}<br>
                ${metadata.userTags && metadata.userTags.length > 0 ? `User Tags: ${metadata.userTags.join(', ')}<br>` : ''}
                Format: Plain HTML with inlined images (CSS-free)
            </p>
        </footer>
    </article>
</body>
</html>`;
};

// Process HTML content, inline images, and remove all CSS
export const generateHTMLWithInlineImages = async (htmlContent, baseUrl, title, description, url, metadata = {}) => {
  try {
    console.log(`🎨 Generating CSS-free HTML with inline images for: ${title}`);
    
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Find all images
    const images = document.querySelectorAll('img');
    console.log(`📸 Found ${images.length} images to process`);
    
    // Process images in parallel (but limit concurrency)
    const imagePromises = Array.from(images).map(async (img, index) => {
      const src = img.getAttribute('src');
      if (!src) return;
      
      // Skip if already a data URL
      if (src.startsWith('data:')) return;
      
      try {
        const dataUrl = await imageToDataURL(src, baseUrl);
        if (dataUrl) {
          img.setAttribute('src', dataUrl);
          // Add alt text if missing
          if (!img.getAttribute('alt')) {
            img.setAttribute('alt', `Image ${index + 1} from ${new URL(baseUrl).hostname}`);
          }
          console.log(`✅ Image ${index + 1}/${images.length} inlined successfully`);
        } else {
          // Keep original src if inlining failed
          console.warn(`⚠️  Keeping original URL for image ${index + 1}: ${src}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to process image ${index + 1}:`, error.message);
      }
    });
    
    // Wait for all images to be processed
    await Promise.all(imagePromises);
    
    // Get the processed HTML content and remove layout CSS while preserving text styling
    const processedContent = removeLayoutCSS(document.body.outerHTML);
    
    // Calculate word count from clean text
    const tempDom = new JSDOM(processedContent);
    const textContent = tempDom.window.document.body.textContent || '';
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    
    // Generate final HTML document
    const finalHTML = generatePlainHTMLTemplate(title, description, url, processedContent, {
      ...metadata,
      wordCount,
      imageCount: images.length
    });
    
    console.log(`✅ HTML generation complete with preserved text styling: ${wordCount} words, ${images.length} images processed`);
    
    return {
      html: finalHTML,
      wordCount,
      imageCount: images.length
    };
    
  } catch (error) {
    console.error('❌ HTML generation error:', error);
    throw new Error(`Failed to generate HTML: ${error.message}`);
  }
};