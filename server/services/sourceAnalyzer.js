import { createClient } from 'webdav';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Analyze sources from WebDAV metadata files
export const analyzeSourcesFromWebDAV = async (webdavConfig) => {
  try {
    const { url, username, password } = webdavConfig;
    
    if (!url || !username || !password) {
      throw new Error('WebDAV configuration incomplete');
    }

    // Ensure URL format is correct
    let webdavUrl = url;
    if (!webdavUrl.startsWith('http://') && !webdavUrl.startsWith('https://')) {
      webdavUrl = `https://${webdavUrl}`;
    }

    const client = createClient(webdavUrl, {
      username,
      password,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    
    console.log(`📊 Scanning WebDAV directory: ${baseDir}`);

    // Test connection first
    try {
      await client.getDirectoryContents('/');
      console.log(`✅ WebDAV connection successful`);
    } catch (connectionError) {
      console.error(`❌ WebDAV connection failed:`, connectionError.message);
      throw new Error(`WebDAV connection failed: ${connectionError.message}`);
    }

    // Check if base directory exists, create if it doesn't
    let files;
    try {
      files = await client.getDirectoryContents(`${baseDir}/metadata`);
      console.log(`📁 Found ${files.length} total files in ${baseDir}`);
    } catch (dirError) {
      if (dirError.message.includes('404') || dirError.message.includes('not found')) {
        console.log(`📁 Directory ${baseDir} not found, creating it...`);
        try {
          await client.createDirectory(baseDir);
          await client.createDirectory(`${baseDir}/metadata`);
          console.log(`✅ Created directories: ${baseDir} and ${baseDir}/metadata`);
          
          // Return empty result since no files exist yet
          return [];
        } catch (createError) {
          console.error(`❌ Failed to create directory:`, createError.message);
          throw new Error(`Failed to create WebDAV directory: ${createError.message}`);
        }
      } else {
        console.error(`❌ Error accessing directory:`, dirError.message, baseDir);
        throw new Error(`Failed to access WebDAV directory: ${dirError.message}`);
      }
    }
    
    // Filter for metadata JSON files
    const metadataFiles = files.filter(file => 
      file.type === 'file'
    );

    console.log(`📋 Found ${metadataFiles.length} metadata files`);

    if (metadataFiles.length === 0) {
      console.log(`ℹ️  No metadata files found. Extract some articles first.`);
      return [];
    }

    // Group articles by domain
    const sourceMap = new Map();

    for (const file of metadataFiles) {
      try {
        console.log(`📄 Processing metadata file: ${file.filename}`);
        const content = await client.getFileContents(file.filename, { format: 'text' });
        const metadata = JSON.parse(content);
        
        if (metadata.domain && metadata.title && metadata.url) {
          const domain = metadata.domain;
          
          if (!sourceMap.has(domain)) {
            sourceMap.set(domain, {
              domain,
              count: 0,
              articles: [],
              rssFeeds: [],
              newsletters: [],
              status: 'pending'
            });
          }
          
          const source = sourceMap.get(domain);
          source.count++;
          source.articles.push({
            title: metadata.title,
            url: metadata.url,
            extractedAt: metadata.extractedAt || metadata.timestamp || new Date().toISOString()
          });
        } else {
          console.warn(`⚠️  Invalid metadata in file ${file.filename}:`, {
            hasDomain: !!metadata.domain,
            hasTitle: !!metadata.title,
            hasUrl: !!metadata.url
          });
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse metadata file ${file.filename}:`, parseError.message);
        // Continue processing other files
      }
    }

    // Convert map to array and sort by article count
    const sources = Array.from(sourceMap.values())
      .sort((a, b) => b.count - a.count);

    console.log(`📊 Analyzed ${sources.length} unique sources from ${metadataFiles.length} metadata files`);

    return sources;
  } catch (error) {
    console.error('WebDAV source analysis error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'WebDAV authentication failed. Please check your credentials.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'WebDAV server not found. Please check your URL.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      errorMessage = 'WebDAV server returned bad request. Please check your URL format and try again.';
    } else if (error.message.includes('connection') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Could not connect to WebDAV server. Please check your URL and network connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'WebDAV request timed out. Please try again.';
    }
    
    throw new Error(`Failed to analyze sources from WebDAV: ${errorMessage}`);
  }
};

// Analyze a single source for RSS feeds and newsletters
export const analyzeSingleSource = async (domain) => {
  const results = {
    rssFeeds: [],
    newsletters: []
  };

  try {
    console.log(`🔍 Analyzing ${domain} for RSS feeds and newsletters`);

    // Validate domain format
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain provided');
    }

    // Clean domain (remove protocol if present)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Try common RSS/feed URLs
    const feedUrls = [
      `https://${cleanDomain}/feed`,
      `https://${cleanDomain}/rss`,
      `https://${cleanDomain}/feed.xml`,
      `https://${cleanDomain}/rss.xml`,
      `https://${cleanDomain}/atom.xml`,
      `https://${cleanDomain}/feeds/all.atom.xml`,
      `https://${cleanDomain}/feeds/posts/default`,
      `https://${cleanDomain}/blog/feed`,
      `https://${cleanDomain}/blog/rss`,
      `https://${cleanDomain}/news/feed`,
      `https://${cleanDomain}/feed.json`
    ];

    // Check each potential feed URL
    for (const feedUrl of feedUrls) {
      try {
        const response = await fetch(feedUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebRipper/1.0; +https://webritper.com)'
          },
          timeout: 5000
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            results.rssFeeds.push({
              url: feedUrl,
              type: contentType.includes('atom') ? 'atom' : 'rss'
            });
            console.log(`✅ Found RSS feed: ${feedUrl}`);
          } else if (contentType.includes('json')) {
            results.rssFeeds.push({
              url: feedUrl,
              type: 'json'
            });
            console.log(`✅ Found JSON feed: ${feedUrl}`);
          }
        }
      } catch (error) {
        // Silently continue - most URLs won't exist
      }
    }

    // Scrape the main page for feed links and newsletter signups
    try {
      const response = await fetch(`https://${cleanDomain}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebRipper/1.0; +https://webritper.com)'
        },
        timeout: 10000
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Look for RSS/feed links in HTML
        $('link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/json"]').each((i, elem) => {
          const href = $(elem).attr('href');
          const title = $(elem).attr('title');
          const type = $(elem).attr('type');
          
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `https://${cleanDomain}${href.startsWith('/') ? '' : '/'}${href}`;
            
            // Avoid duplicates
            if (!results.rssFeeds.some(feed => feed.url === fullUrl)) {
              results.rssFeeds.push({
                url: fullUrl,
                title: title || 'RSS Feed',
                type: type.includes('atom') ? 'atom' : type.includes('json') ? 'json' : 'rss'
              });
              console.log(`✅ Found RSS link in HTML: ${fullUrl}`);
            }
          }
        });

        // Look for newsletter signup forms and links
        const newsletterSelectors = [
          'form[action*="newsletter"]',
          'form[action*="subscribe"]',
          'form[action*="signup"]',
          'form[action*="mailchimp"]',
          'form[action*="substack"]',
          'form[action*="convertkit"]',
          'a[href*="newsletter"]',
          'a[href*="subscribe"]',
          'a[href*="signup"]',
          'a[href*="mailchimp"]',
          'a[href*="substack"]',
          '.newsletter-signup',
          '.email-signup',
          '.subscribe-form'
        ];

        newsletterSelectors.forEach(selector => {
          $(selector).each((i, elem) => {
            const $elem = $(elem);
            let url = null;
            let title = null;

            if (elem.tagName === 'form') {
              url = $elem.attr('action');
              title = $elem.find('input[type="submit"]').val() || 
                     $elem.find('button').text().trim() || 
                     'Newsletter Signup';
            } else if (elem.tagName === 'a') {
              url = $elem.attr('href');
              title = $elem.text().trim() || 'Newsletter';
            } else {
              // For class-based selectors, look for forms or links inside
              const form = $elem.find('form').first();
              const link = $elem.find('a').first();
              
              if (form.length) {
                url = form.attr('action');
                title = form.find('input[type="submit"]').val() || 'Newsletter Signup';
              } else if (link.length) {
                url = link.attr('href');
                title = link.text().trim() || 'Newsletter';
              }
            }

            if (url && url !== '#') {
              const fullUrl = url.startsWith('http') ? url : `https://${cleanDomain}${url.startsWith('/') ? '' : '/'}${url}`;
              
              // Avoid duplicates and filter out obvious non-newsletter URLs
              if (!results.newsletters.some(newsletter => newsletter.url === fullUrl) &&
                  !fullUrl.includes('facebook.com') &&
                  !fullUrl.includes('twitter.com') &&
                  !fullUrl.includes('instagram.com')) {
                
                results.newsletters.push({
                  url: fullUrl,
                  title: title || 'Newsletter',
                  type: fullUrl.includes('substack') ? 'substack' : 
                        fullUrl.includes('mailchimp') ? 'mailchimp' :
                        fullUrl.includes('convertkit') ? 'convertkit' : 'newsletter'
                });
                console.log(`✅ Found newsletter signup: ${fullUrl}`);
              }
            }
          });
        });
      }
    } catch (scrapeError) {
      console.error(`Failed to scrape ${cleanDomain}:`, scrapeError.message);
    }

    console.log(`📊 Analysis complete for ${cleanDomain}: ${results.rssFeeds.length} RSS feeds, ${results.newsletters.length} newsletters`);
    
    return results;
  } catch (error) {
    console.error(`Source analysis failed for ${domain}:`, error);
    throw new Error(`Failed to analyze ${domain}: ${error.message}`);
  }
};