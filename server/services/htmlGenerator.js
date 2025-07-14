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

// Remove all CSS-related attributes from HTML elements
const removeAllCSS = (htmlContent) => {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Remove all style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => tag.remove());
    
    // Remove all link tags with rel="stylesheet"
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(tag => tag.remove());
    
    // Remove all inline style attributes
    const elementsWithStyle = document.querySelectorAll('[style]');
    elementsWithStyle.forEach(element => {
      element.removeAttribute('style');
    });
    
    // Remove all CSS class attributes
    const elementsWithClass = document.querySelectorAll('[class]');
    elementsWithClass.forEach(element => {
      element.removeAttribute('class');
    });
    
    // Remove other CSS-related attributes
    const cssAttributes = ['id', 'data-*'];
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      // Remove id attributes (optional - uncomment if you want to remove all IDs)
      // element.removeAttribute('id');
      
      // Remove data-* attributes that might be used for styling
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && 
            (attr.name.includes('style') || 
             attr.name.includes('class') || 
             attr.name.includes('css'))) {
          element.removeAttribute(attr.name);
        }
      });
    });
    
    console.log(`🧹 CSS removed: ${styleTags.length} style tags, ${linkTags.length} stylesheets, ${elementsWithStyle.length} inline styles, ${elementsWithClass.length} class attributes`);
    
    return document.body.innerHTML;
  } catch (error) {
    console.error('Error removing CSS:', error);
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
    
    // Get the processed HTML content and remove all CSS
    const processedContent = removeAllCSS(document.body.outerHTML);
    
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
    
    console.log(`✅ CSS-free HTML generation complete: ${wordCount} words, ${images.length} images processed`);
    
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