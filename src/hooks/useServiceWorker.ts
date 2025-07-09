import { useState, useEffect } from 'react';
import { serviceWorkerManager, ShareData } from '../utils/serviceWorker';

export interface UseServiceWorkerReturn {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  pendingExtractions: number;
  addToOfflineQueue: (url: string, tags: string[]) => Promise<void>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
}

export const useServiceWorker = (): UseServiceWorkerReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [pendingExtractions, setPendingExtractions] = useState(0);

  useEffect(() => {
    // Initialize service worker
    const initServiceWorker = async () => {
      try {
        const registered = await serviceWorkerManager.register();
        setIsServiceWorkerReady(registered);
        
        if (registered) {
          // Update pending extractions count
          const pending = await serviceWorkerManager.getPendingExtractions();
          setPendingExtractions(pending.length);
        }
      } catch (error) {
        console.error('Service Worker initialization failed:', error);
      }
    };

    initServiceWorker();

    // Listen for online/offline status changes
    const unsubscribe = serviceWorkerManager.onOnlineStatusChange(setIsOnline);

    return unsubscribe;
  }, []);

  const addToOfflineQueue = async (url: string, tags: string[] = []) => {
    if (!isServiceWorkerReady) {
      throw new Error('Service Worker not ready');
    }

    const token = localStorage.getItem('token');
    
    await serviceWorkerManager.addToQueue({
      url,
      tags,
      token: token || undefined
    });

    // Update pending count
    const pending = await serviceWorkerManager.getPendingExtractions();
    setPendingExtractions(pending.length);

    // Show notification
    await serviceWorkerManager.showNotification('Web Ripper', {
      body: `Added to offline queue: ${url}`,
      tag: 'offline-queue'
    });
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (!isServiceWorkerReady) {
      throw new Error('Service Worker not ready');
    }

    await serviceWorkerManager.showNotification(title, options);
  };

  return {
    isOnline,
    isServiceWorkerReady,
    pendingExtractions,
    addToOfflineQueue,
    showNotification
  };
};