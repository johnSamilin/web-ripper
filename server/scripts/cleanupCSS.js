import { createClient } from 'webdav';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Plain HTML template without CSS
const generateCleanHTML = (title, description, url, content, metadata = {}) => {
  const extractedDate = metadata.extractedAt ? 
    new Date(metadata.extractedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 
    new Date().toLocaleDateString('en-US', {
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
    <meta name="description" content="${description || ''}">
    <meta name="generator" content="Web Ripper - CSS Cleaned">
    <meta name="extracted-date" content="${metadata.extractedAt || new Date().toISOString()}">
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
                Extraction Date: ${metadata.extractedAt || new Date().toISOString()}<br>
                ${metadata.userTags && metadata.userTags.length > 0 ? `User Tags: ${metadata.userTags.join(', ')}<br>` : ''}
                ${metadata.aiGenerated ? 'AI-Enhanced Tagging: Enabled<br>' : ''}
                Format: Plain HTML (CSS Cleaned)<br>
                Cleanup Date: ${new Date().toISOString()}
            </p>
        </footer>
    </article>
</body>
</html>`;
};

// Remove all CSS and CSS-related attributes from HTML content
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
    
    // Remove CSS-related data attributes
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && 
            (attr.name.includes('style') || 
             attr.name.includes('class') || 
             attr.name.includes('css') ||
             attr.name.includes('theme') ||
             attr.name.includes('color'))) {
          element.removeAttribute(attr.name);
        }
      });
    });
    
    console.log(`🧹 CSS removed: ${styleTags.length} style tags, ${linkTags.length} stylesheets, ${elementsWithStyle.length} inline styles, ${elementsWithClass.length} class attributes`);
    
    return document.documentElement.outerHTML;
  } catch (error) {
    console.error('Error removing CSS:', error);
    return htmlContent; // Return original if cleaning fails
  }
};

// Extract content from existing HTML file
const extractContentFromHTML = (htmlContent) => {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Try to extract title
    let title = document.querySelector('h1')?.textContent?.trim() || 
                document.querySelector('title')?.textContent?.trim() || 
                'Untitled Article';
    
    // Try to extract description
    let description = document.querySelector('blockquote')?.textContent?.trim() || 
                     document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                     '';
    
    // Try to extract original URL
    let url = document.querySelector('meta[name="source-url"]')?.getAttribute('content') || 
              document.querySelector('a[href*="http"]')?.getAttribute('href') || 
              '';
    
    // Extract main content (try different selectors)
    let content = '';
    const mainElement = document.querySelector('main') || 
                       document.querySelector('article') || 
                       document.querySelector('.content') || 
                       document.querySelector('#content') || 
                       document.body;
    
    if (mainElement) {
      // Clone the element to avoid modifying original
      const contentClone = mainElement.cloneNode(true);
      
      // Remove header and footer from main content
      const header = contentClone.querySelector('header');
      const footer = contentClone.querySelector('footer');
      if (header) header.remove();
      if (footer) footer.remove();
      
      content = contentClone.innerHTML;
    }
    
    // Try to extract metadata
    const metadata = {};
    
    // Extract from meta tags
    const extractedBy = document.querySelector('meta[name="extracted-by"]')?.getAttribute('content');
    const extractedDate = document.querySelector('meta[name="extracted-date"]')?.getAttribute('content');
    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
    
    if (extractedBy) metadata.extractedBy = extractedBy;
    if (extractedDate) metadata.extractedAt = extractedDate;
    if (keywords) metadata.tags = keywords.split(',').map(tag => tag.trim());
    
    // Try to extract from footer text
    const footer = document.querySelector('footer');
    if (footer) {
      const footerText = footer.textContent;
      
      // Extract word count
      const wordMatch = footerText.match(/(\d+)\s+words?/i);
      if (wordMatch) metadata.wordCount = parseInt(wordMatch[1]);
      
      // Extract image count
      const imageMatch = footerText.match(/(\d+)\s+images?/i);
      if (imageMatch) metadata.imageCount = parseInt(imageMatch[1]);
      
      // Check for AI tagging
      if (footerText.includes('AI-Enhanced')) metadata.aiGenerated = true;
    }
    
    return {
      title,
      description,
      url,
      content,
      metadata
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
};

// Test WebDAV connection
const testWebDAVConnection = async (webdavConfig) => {
  try {
    const { url, username, password } = webdavConfig;
    
    console.log(`🔍 Testing WebDAV connection to: ${url}`);
    console.log(`👤 Username: ${username}`);
    
    const client = createClient(url, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    // Test connection by listing root directory
    const contents = await client.getDirectoryContents('/');
    console.log(`✅ WebDAV connection successful. Found ${contents.length} items in root directory`);
    
    return true;
  } catch (error) {
    console.error('❌ WebDAV connection test failed:', error.message);
    throw new Error(`WebDAV connection failed: ${error.message}`);
  }
};

// Main cleanup function
const cleanupCSSInFiles = async (webdavConfig) => {
  try {
    const { url, username, password } = webdavConfig;
    
    if (!url || !username || !password) {
      throw new Error('WebDAV configuration incomplete');
    }

    // Test connection first
    await testWebDAVConnection(webdavConfig);

    const client = createClient(url, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    
    console.log(`🧹 Starting CSS cleanup in: ${baseDir}`);

    // Check if base directory exists
    let files;
    try {
      files = await client.getDirectoryContents(baseDir, { deep: true });
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log(`📁 Directory ${baseDir} not found. No files to clean.`);
        return {
          totalFiles: 0,
          processedFiles: 0,
          errorFiles: 0
        };
      }
      throw error;
    }
    
    // Filter for HTML files
    const htmlFiles = files.filter(file => 
      file.type === 'file' && 
      (file.filename.endsWith('.html') || file.filename.endsWith('.htm')) &&
      !file.filename.includes('.backup.')
    );

    console.log(`📄 Found ${htmlFiles.length} HTML files to process`);

    if (htmlFiles.length === 0) {
      console.log(`ℹ️  No HTML files found to clean`);
      return {
        totalFiles: 0,
        processedFiles: 0,
        errorFiles: 0
      };
    }

    let processedCount = 0;
    let errorCount = 0;
    let backupCount = 0;

    for (const file of htmlFiles) {
      try {
        console.log(`\n🔄 Processing: ${file.filename}`);
        
        // Download the file
        const content = await client.getFileContents(file.filename, { format: 'text' });
        
        // Check if file already appears to be cleaned
        if (content.includes('CSS Cleaned') || content.includes('Format: Plain HTML')) {
          console.log(`⏭️  File already cleaned, skipping: ${file.filename}`);
          continue;
        }
        
        // Extract content and metadata
        const extracted = extractContentFromHTML(content);
        if (!extracted) {
          console.warn(`⚠️  Could not extract content from: ${file.filename}`);
          errorCount++;
          continue;
        }
        
        // Remove ALL CSS from content (including classes and inline styles)
        const cleanContent = removeAllCSS(extracted.content);
        
        // Generate new clean HTML
        const cleanHTML = generateCleanHTML(
          extracted.title,
          extracted.description,
          extracted.url,
          cleanContent,
          extracted.metadata
        );
        
        // Create backup filename
        const backupFilename = file.filename.replace(/\.(html?|htm)$/i, '.backup.$1');
        
        // Backup original file
        try {
          await client.copyFile(file.filename, backupFilename);
          console.log(`💾 Backup created: ${backupFilename}`);
          backupCount++;
        } catch (backupError) {
          console.warn(`⚠️  Could not create backup: ${backupError.message}`);
          // Continue without backup - user should be warned
        }
        
        // Upload cleaned file
        await client.putFileContents(file.filename, cleanHTML, {
          overwrite: true,
          contentType: 'text/html'
        });
        
        console.log(`✅ Cleaned: ${file.filename} (removed all CSS classes and inline styles)`);
        processedCount++;
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing ${file.filename}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 CSS Cleanup Complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Total HTML files found: ${htmlFiles.length}`);
    console.log(`   • Successfully processed: ${processedCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Backup files created: ${backupCount}`);
    
    return {
      totalFiles: htmlFiles.length,
      processedFiles: processedCount,
      errorFiles: errorCount,
      backupFiles: backupCount
    };
    
  } catch (error) {
    console.error('❌ CSS cleanup failed:', error);
    throw new Error(`CSS cleanup failed: ${error.message}`);
  }
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧹 WEB RIPPER CSS CLEANUP SCRIPT');
  console.log('================================\n');
  
  // Check for WebDAV configuration
  const webdavConfig = {
    url: process.env.WEBDAV_URL,
    username: process.env.WEBDAV_USERNAME,
    password: process.env.WEBDAV_PASSWORD
  };
  
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    console.error('❌ WebDAV configuration missing!');
    console.error('Please set the following environment variables:');
    console.error('   • WEBDAV_URL');
    console.error('   • WEBDAV_USERNAME');
    console.error('   • WEBDAV_PASSWORD');
    process.exit(1);
  }
  
  console.log(`🔗 WebDAV URL: ${webdavConfig.url}`);
  console.log(`👤 Username: ${webdavConfig.username}`);
  console.log(`📁 Base directory: ${process.env.WEBDAV_BASE_PATH || '/web-ripper'}\n`);
  
  // Ask for confirmation
  console.log('⚠️  WARNING: This will modify all HTML files in your WebDAV storage!');
  console.log('   • Original files will be backed up with .backup extension');
  console.log('   • All CSS styling, classes, and inline styles will be removed');
  console.log('   • Files will be converted to plain HTML format\n');
  
  // For CLI usage, you might want to add a confirmation prompt
  // For now, we'll proceed automatically
  
  cleanupCSSInFiles(webdavConfig)
    .then(result => {
      console.log('\n🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Cleanup failed:', error.message);
      process.exit(1);
    });
}

export { cleanupCSSInFiles };