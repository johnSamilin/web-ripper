import { useState, useEffect } from 'react';

export interface UseSharedUrlReturn {
  sharedUrl: string | null;
  clearSharedUrl: () => void;
}

export const useSharedUrl = (): UseSharedUrlReturn => {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    // Listen for shared URLs from service worker
    const handleSharedUrl = (event: CustomEvent<{ url: string }>) => {
      console.log('🔗 Received shared URL:', event.detail.url);
      setSharedUrl(event.detail.url);
    };

    window.addEventListener('sharedUrl', handleSharedUrl as EventListener);

    // Check URL parameters on mount (for direct share target)
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');
    const titleParam = urlParams.get('title');
    const textParam = urlParams.get('text');

    const targetUrl = urlParam || titleParam || textParam;
    if (targetUrl) {
      console.log('🔗 Found shared URL in parameters:', targetUrl);
      setSharedUrl(targetUrl);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      window.removeEventListener('sharedUrl', handleSharedUrl as EventListener);
    };
  }, []);

  const clearSharedUrl = () => {
    setSharedUrl(null);
  };

  return {
    sharedUrl,
    clearSharedUrl
  };
};