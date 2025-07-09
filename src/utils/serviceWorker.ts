// Service Worker registration and management utilities

export interface ShareData {
  url?: string;
  title?: string;
  text?: string;
}

export interface PendingExtraction {
  id: string;
  url: string;
  tags: string[];
  token?: string;
  timestamp: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;

  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return false;
    }

    try {
      console.log('🔧 Registering Service Worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found');
        const newWorker = this.registration?.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 New Service Worker available');
              this.showUpdateNotification();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      // Handle shared URLs from service worker
      this.handleSharedContent();

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    console.log('📨 Message from Service Worker:', event.data);
    
    if (event.data?.type === 'SHARED_URL') {
      this.handleSharedUrl(event.data.url);
    }
  }

  private handleSharedUrl(url: string) {
    if (!url) return;

    console.log('🔗 Handling shared URL:', url);
    
    // Dispatch custom event for the app to handle
    window.dispatchEvent(new CustomEvent('sharedUrl', {
      detail: { url }
    }));
  }

  private handleSharedContent() {
    // Check URL parameters for shared content
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    const sharedTitle = urlParams.get('title');
    const sharedText = urlParams.get('text');

    if (sharedUrl || sharedTitle || sharedText) {
      const targetUrl = sharedUrl || sharedTitle || sharedText;
      if (targetUrl) {
        console.log('🔗 Found shared content in URL:', targetUrl);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Handle the shared URL
        this.handleSharedUrl(targetUrl);
      }
    }
  }

  private showUpdateNotification() {
    // You can implement a custom update notification here
    if (confirm('A new version of Web Ripper is available. Reload to update?')) {
      window.location.reload();
    }
  }

  async addToQueue(extraction: Omit<PendingExtraction, 'id' | 'timestamp'>): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    const pendingExtraction: PendingExtraction = {
      ...extraction,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    // Store in IndexedDB or localStorage for background sync
    await this.storePendingExtraction(pendingExtraction);

    // Request background sync
    if ('sync' in this.registration) {
      try {
        await this.registration.sync.register('extract-content');
        console.log('🔄 Background sync registered');
      } catch (error) {
        console.error('❌ Background sync registration failed:', error);
      }
    }
  }

  private async storePendingExtraction(extraction: PendingExtraction): Promise<void> {
    // For now, use localStorage. In production, use IndexedDB
    const stored = localStorage.getItem('pendingExtractions');
    const pending: PendingExtraction[] = stored ? JSON.parse(stored) : [];
    
    pending.push(extraction);
    localStorage.setItem('pendingExtractions', JSON.stringify(pending));
  }

  async getPendingExtractions(): Promise<PendingExtraction[]> {
    const stored = localStorage.getItem('pendingExtractions');
    return stored ? JSON.parse(stored) : [];
  }

  async removePendingExtraction(id: string): Promise<void> {
    const stored = localStorage.getItem('pendingExtractions');
    if (!stored) return;

    const pending: PendingExtraction[] = JSON.parse(stored);
    const filtered = pending.filter(item => item.id !== id);
    
    localStorage.setItem('pendingExtractions', JSON.stringify(filtered));
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    const hasPermission = await this.requestNotificationPermission();
    if (!hasPermission) {
      console.warn('⚠️ Notification permission denied');
      return;
    }

    await this.registration.showNotification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register service worker
if (typeof window !== 'undefined') {
  serviceWorkerManager.register().catch(console.error);
}