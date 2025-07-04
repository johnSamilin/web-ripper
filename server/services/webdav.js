import { createClient } from 'webdav';

export const uploadToWebDAV = async (webdavConfig, filename, content, metadata = {}, datePath = '') => {
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

    // Create base web-ripper directory if it doesn't exist
    const baseDir = process.env.WEBDAV_BASE_PATH || '/web-ripper';
    try {
      const dirExists = await client.exists(baseDir);
      if (!dirExists) {
        await client.createDirectory(baseDir);
        console.log(`📁 Created base directory: ${baseDir}`);
      }
    } catch (error) {
      console.log(`📁 Base directory creation attempt: ${error.message}`);
      try {
        await client.createDirectory(baseDir);
      } catch (createError) {
        console.log(`📁 Base directory might already exist: ${createError.message}`);
      }
    }

    // Create date-based directory structure if datePath is provided
    let targetDir = baseDir;
    if (datePath) {
      const pathParts = datePath.split('/');
      let currentPath = baseDir;
      
      for (const part of pathParts) {
        currentPath = `${currentPath}/${part}`;
        try {
          const dirExists = await client.exists(currentPath);
          if (!dirExists) {
            await client.createDirectory(currentPath);
            console.log(`📁 Created directory: ${currentPath}`);
          }
        } catch (error) {
          console.log(`📁 Directory creation attempt: ${error.message}`);
          try {
            await client.createDirectory(currentPath);
          } catch (createError) {
            console.log(`📁 Directory might already exist: ${createError.message}`);
          }
        }
      }
      targetDir = currentPath;
    }

    // Create metadata subdirectory
    const metadataDir = `${targetDir}/metadata`;
    try {
      const metaDirExists = await client.exists(metadataDir);
      if (!metaDirExists) {
        await client.createDirectory(metadataDir);
        console.log(`📁 Created metadata directory: ${metadataDir}`);
      }
    } catch (error) {
      console.log(`📁 Metadata directory creation attempt: ${error.message}`);
      try {
        await client.createDirectory(metadataDir);
      } catch (createError) {
        console.log(`📁 Metadata directory might already exist: ${createError.message}`);
      }
    }

    // Generate timestamp for unique filenames
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseFilename = filename.replace(/[^a-z0-9._-]/gi, '_');
    
    // Upload main content file
    const finalFilename = `${targetDir}/${timestamp}_${baseFilename}`;
    
    console.log(`📤 Uploading file to: ${finalFilename}`);
    
    await client.putFileContents(finalFilename, content, {
      overwrite: true,
      contentType: filename.endsWith('.html') ? 'text/html' : 'text/markdown'
    });

    console.log(`✅ File uploaded successfully: ${finalFilename}`);

    let metadataPath = null;

    // Upload metadata if provided
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataFilename = `${metadataDir}/${timestamp}_${baseFilename.replace(/\.(md|html?)$/i, '.json')}`;
      const metadataContent = JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
        filename: finalFilename,
        uploadedAt: new Date().toISOString(),
        organizationPath: datePath
      }, null, 2);
      
      console.log(`📤 Uploading metadata to: ${metadataFilename}`);
      
      await client.putFileContents(metadataFilename, metadataContent, {
        overwrite: true,
        contentType: 'application/json'
      });

      console.log(`✅ Metadata uploaded successfully: ${metadataFilename}`);
      metadataPath = metadataFilename;
    }

    // Verify the upload by checking if file exists
    try {
      const fileExists = await client.exists(finalFilename);
      if (!fileExists) {
        throw new Error('File upload verification failed - file does not exist after upload');
      }
      console.log(`✅ Upload verified: ${finalFilename}`);
    } catch (verifyError) {
      console.warn(`⚠️  Could not verify upload: ${verifyError.message}`);
    }

    return {
      success: true,
      path: finalFilename,
      url: `${webdavUrl.replace(/\/$/, '')}${finalFilename}`,
      metadataPath: metadataPath,
      organizationPath: datePath
    };
  } catch (error) {
    console.error('❌ WebDAV upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      config: {
        url: webdavConfig.url,
        username: webdavConfig.username,
        hasPassword: !!webdavConfig.password
      }
    });
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'WebDAV authentication failed. Please check your credentials.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'WebDAV server not found. Please check your URL.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      errorMessage = 'WebDAV server returned bad request. Please check your URL format.';
    } else if (error.message.includes('connection') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Could not connect to WebDAV server. Please check your URL and network connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'WebDAV request timed out. Please try again.';
    }
    
    throw new Error(`WebDAV upload failed: ${errorMessage}`);
  }
};

export const testWebDAVConnection = async (webdavConfig) => {
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

    console.log(`🔍 Testing WebDAV connection to: ${webdavUrl}`);

    // Test connection by listing root directory
    const contents = await client.getDirectoryContents('/');
    console.log(`✅ WebDAV connection successful. Found ${contents.length} items in root directory`);
    
    // Test if we can create directories
    const testDir = '/web-ripper-test';
    try {
      await client.createDirectory(testDir);
      await client.deleteFile(testDir);
      console.log(`✅ WebDAV write permissions confirmed`);
    } catch (permError) {
      console.warn(`⚠️  WebDAV write test failed: ${permError.message}`);
    }
    
    return { 
      success: true, 
      message: 'WebDAV connection successful',
      details: `Connected to ${webdavUrl} with ${contents.length} items in root`
    };
  } catch (error) {
    console.error('❌ WebDAV test error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'WebDAV authentication failed. Please check your credentials.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      errorMessage = 'WebDAV server not found. Please check your URL.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      errorMessage = 'WebDAV server returned bad request. Please check your URL format (should include full path like /dav or /webdav).';
    } else if (error.message.includes('connection') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Could not connect to WebDAV server. Please check your URL and network connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'WebDAV request timed out. Please try again.';
    }
    
    throw new Error(`WebDAV connection failed: ${errorMessage}`);
  }
};

// Helper function to list files in web-ripper directory (for future search functionality)
export const listWebDAVFiles = async (webdavConfig) => {
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
    
    try {
      const files = await client.getDirectoryContents(baseDir, { deep: true });
      return files.filter(file => file.type === 'file' && (file.filename.endsWith('.md') || file.filename.endsWith('.html')));
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return []; // Directory doesn't exist yet
      }
      throw error;
    }
  } catch (error) {
    console.error('WebDAV list files error:', error);
    throw new Error(`Failed to list WebDAV files: ${error.message}`);
  }
};