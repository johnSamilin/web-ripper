// Web Ripper Service Worker
const CACHE_NAME = 'web-ripper-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/badge.svg',
  '/notification-icon.svg',
  '/share-icon.svg',
  '/offline-icon.svg',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (let them go to network)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('📦 Serving from cache:', event.request.url);
          return cachedResponse;
        }

        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('❌ Network fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Handle share target
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SHARE_TARGET') {
    const { url, title, text } = event.data;
    
    // Store shared data for the app to retrieve
    self.registration.showNotification('Web Ripper', {
      body: `Shared URL: ${url || title || text}`,
      icon: '/notification-icon.svg',
      badge: '/badge.svg',
      tag: 'share-target',
      data: { url, title, text },
      actions: [
        {
          action: 'open',
          title: 'Open Web Ripper'
        }
      ]
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const { url, title, text } = event.notification.data || {};
    const targetUrl = url || title || text;
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clients) => {
          // Check if app is already open
          for (const client of clients) {
            if (client.url.includes(self.registration.scope)) {
              // Focus existing window and send shared data
              client.focus();
              client.postMessage({
                type: 'SHARED_URL',
                url: targetUrl
              });
              return;
            }
          }
          
          // Open new window with shared data
          const params = targetUrl ? `?url=${encodeURIComponent(targetUrl)}` : '';
          return self.clients.openWindow(`/${params}`);
        })
    );
  }
});

// Background sync for offline extraction requests
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'extract-content') {
    event.waitUntil(
      // Handle offline extraction requests
      handleOfflineExtractions()
    );
  }
});

async function handleOfflineExtractions() {
  try {
    // Get pending extractions from IndexedDB or localStorage
    const pendingExtractions = await getPendingExtractions();
    
    for (const extraction of pendingExtractions) {
      try {
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(extraction.token && { 'Authorization': `Bearer ${extraction.token}` })
          },
          body: JSON.stringify({
            url: extraction.url,
            tags: extraction.tags || []
          })
        });
        
        if (response.ok) {
          // Remove from pending list
          await removePendingExtraction(extraction.id);
          
          // Notify user of successful extraction
          self.registration.showNotification('Web Ripper', {
            body: `Successfully extracted: ${extraction.url}`,
            icon: '/notification-icon.svg',
            badge: '/badge.svg',
            tag: 'extraction-success'
          });
        }
      } catch (error) {
        console.error('❌ Background extraction failed:', error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Helper functions for managing pending extractions
async function getPendingExtractions() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingExtraction(id) {
  // Remove from IndexedDB
  console.log('Removing pending extraction:', id);
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Web Ripper', {
        body: data.body,
        icon: data.icon || '/notification-icon.svg',
        badge: '/badge.svg',
        data: data.data
      })
    );
  }
});

console.log('🎯 Web Ripper Service Worker loaded');