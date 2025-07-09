import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

import { useServiceWorker } from './hooks/useServiceWorker';
import { useSharedUrl } from './hooks/useSharedUrl';
import Header from './components/Header';
import BackgroundElements from './components/BackgroundElements';
import LoadingSpinner from './components/LoadingSpinner';
import AuthForm from './components/AuthForm';
import WebDAVSettings from './components/WebDAVSettings';
import ExtractionForm from './components/ExtractionForm';
import ExtractionResult from './components/ExtractionResult';
import InfoSection from './components/InfoSection';
import BrutalCard from './components/BrutalCard';
import PocketImport from './components/PocketImport';
import SourceAnalysis from './components/SourceAnalysis';
import LandingPage from './components/LandingPage';
import OfflineIndicator from './components/OfflineIndicator';

interface ExtractResult {
  success: boolean;
  title: string;
  description: string;
  filename: string;
  content: string;
  wordCount: number;
  imageCount?: number;
  url: string;
  tags?: string[];
  format?: string;
  webdav?: {
    uploaded: boolean;
    path: string;
    url: string;
    metadataPath?: string;
  };
}

interface UserData {
  id: number;
  username: string;
  email: string;
  hasWebDAV: boolean;
}

interface WebDAVSettings {
  url: string;
  username: string;
  hasPassword: boolean;
  isConfigured: boolean;
}

interface AuthFormData {
  username: string;
  email: string;
  password: string;
}

interface WebDAVFormData {
  url: string;
  username: string;
  password: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  
  // Service Worker and sharing hooks
  const { isOnline, addToOfflineQueue, showNotification } = useServiceWorker();
  const { sharedUrl, clearSharedUrl } = useSharedUrl();
  
  // App state
  const [showLanding, setShowLanding] = useState(true);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPocketImport, setShowPocketImport] = useState(false);
  const [showSourceAnalysis, setShowSourceAnalysis] = useState(false);
  
  // Auth form state
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  
  // WebDAV settings state
  const [webdavSettings, setWebdavSettings] = useState<WebDAVSettings>({
    url: '',
    username: '',
    hasPassword: false,
    isConfigured: false
  });
  const [webdavLoading, setWebdavLoading] = useState(false);
  const [webdavError, setWebdavError] = useState('');
  const [webdavSuccess, setWebdavSuccess] = useState('');

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle shared URLs
  useEffect(() => {
    if (sharedUrl && !showLanding) {
      console.log('🔗 Processing shared URL:', sharedUrl);
      // Auto-fill the extraction form with shared URL
      setShowLanding(false);
      setShowAuth(false);
      setShowSettings(false);
      setShowPocketImport(false);
      setShowSourceAnalysis(false);
      
      // You can auto-trigger extraction here if desired
      // handleSubmit(sharedUrl, []);
      
      clearSharedUrl();
    }
  }, [sharedUrl, showLanding]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        loadWebDAVSettings();
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadWebDAVSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/settings/webdav', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWebdavSettings(data.webdav);
      }
    } catch (error) {
      console.error('Failed to load WebDAV settings:', error);
    }
  };

  const handleAuth = async (formData: AuthFormData, isLogin: boolean) => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        setShowAuth(false);
        loadWebDAVSettings();
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError('Network error occurred');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setResult(null);
    setShowSettings(false);
    setShowAuth(false);
    setShowPocketImport(false);
    setShowSourceAnalysis(false);
    setShowLanding(true);
  };

  const handleWebDAVSave = async (formData: WebDAVFormData) => {
    setWebdavLoading(true);
    setWebdavError('');
    setWebdavSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setWebdavError('Authentication required');
        return;
      }

      const response = await fetch('/api/settings/webdav', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setWebdavSettings(data.webdav);
        setWebdavSuccess('WebDAV settings saved successfully!');
        // Update user data
        if (user) {
          setUser({ ...user, hasWebDAV: data.webdav.isConfigured });
        }
        // Clear success message after 3 seconds
        setTimeout(() => setWebdavSuccess(''), 3000);
      } else {
        setWebdavError(data.error || 'Failed to save WebDAV settings');
      }
    } catch (error) {
      console.error('WebDAV save error:', error);
      setWebdavError('Network error occurred');
    } finally {
      setWebdavLoading(false);
    }
  };

  const handleSubmit = async (url: string, tags: string[] = []) => {
    setLoading(true);
    setError('');
    setResult(null);

    // If offline, add to queue
    if (!isOnline) {
      try {
        await addToOfflineQueue(url, tags);
        setError('You are offline. The extraction has been queued and will be processed when you reconnect.');
        return;
      } catch (err) {
        setError('Failed to queue extraction for offline processing');
        return;
      } finally {
        setLoading(false);
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url, tags }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract content');
      }

      setResult(data);
      
      // Show success notification
      if ('Notification' in window) {
        try {
          await showNotification('Web Ripper', {
            body: `Successfully extracted: ${data.title}`,
            tag: 'extraction-success'
          });
        } catch (notifError) {
          console.warn('Failed to show notification:', notifError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!result) return;

    const mimeType = result.format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([result.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setResult(null);
    setError('');
  };

  const handleGetStarted = () => {
    setShowLanding(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <BrutalCard>
          <LoadingSpinner />
        </BrutalCard>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gray-100 relative overflow-hidden">
        <BackgroundElements />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-black border-4 border-red-500 flex items-center justify-center mx-auto mb-4 transform rotate-12">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-3xl font-black text-black uppercase tracking-wider transform skew-x-neg5 mb-2">WEB RIPPER</h1>
              <p className="text-sm font-bold text-red-600 uppercase tracking-widest">SECURE ACCESS</p>
            </div>

            <AuthForm
              onSubmit={handleAuth}
              loading={authSubmitting}
              error={authError}
              onClose={() => setShowAuth(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showSettings && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 relative overflow-hidden">
        <BackgroundElements />

        {/* Header */}
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onShowSettings={() => setShowSettings(true)}
          onShowAuth={() => setShowAuth(true)}
          onLogout={handleLogout}
          onShowPocketImport={() => setShowPocketImport(true)}
          onShowSourceAnalysis={() => setShowSourceAnalysis(true)}
          onShowLanding={() => setShowLanding(true)}
        />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-black uppercase tracking-wider">SETTINGS</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="bg-gray-200 hover:bg-gray-300 text-black font-black py-2 px-4 border-4 border-black transition-all duration-200 uppercase tracking-wider"
              >
                BACK
              </button>
            </div>

            <WebDAVSettings
              settings={webdavSettings}
              onSave={handleWebDAVSave}
              loading={webdavLoading}
              error={webdavError}
              success={webdavSuccess}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showPocketImport) {
    return (
      <div className="min-h-screen bg-gray-100 relative overflow-hidden">
        <BackgroundElements />

        {/* Header */}
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onShowSettings={() => setShowSettings(true)}
          onShowAuth={() => setShowAuth(true)}
          onLogout={handleLogout}
          onShowPocketImport={() => setShowPocketImport(true)}
          onShowSourceAnalysis={() => setShowSourceAnalysis(true)}
          onShowLanding={() => setShowLanding(true)}
        />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto">
            <PocketImport
              onClose={() => setShowPocketImport(false)}
              isAuthenticated={isAuthenticated}
              hasWebDAV={user?.hasWebDAV || false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showSourceAnalysis) {
    return (
      <div className="min-h-screen bg-gray-100 relative overflow-hidden">
        <BackgroundElements />

        {/* Header */}
        <Header
          isAuthenticated={isAuthenticated}
          user={user}
          onShowSettings={() => setShowSettings(true)}
          onShowAuth={() => setShowAuth(true)}
          onLogout={handleLogout}
          onShowPocketImport={() => setShowPocketImport(true)}
          onShowSourceAnalysis={() => setShowSourceAnalysis(true)}
          onShowLanding={() => setShowLanding(true)}
        />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="max-w-2xl mx-auto">
            <SourceAnalysis
              onClose={() => setShowSourceAnalysis(false)}
              isAuthenticated={isAuthenticated}
              hasWebDAV={user?.hasWebDAV || false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative overflow-hidden">
      <BackgroundElements />

      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onShowSettings={() => setShowSettings(true)}
        onShowAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
        onShowPocketImport={() => setShowPocketImport(true)}
        onShowSourceAnalysis={() => setShowSourceAnalysis(true)}
        onShowLanding={() => setShowLanding(true)}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-md mx-auto">
          {!result ? (
            <div className="space-y-6">
              <ExtractionForm
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                isAuthenticated={isAuthenticated}
                hasWebDAV={user?.hasWebDAV || false}
              />

              <InfoSection
                isAuthenticated={isAuthenticated}
                hasWebDAV={user?.hasWebDAV || false}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <ExtractionResult
                result={result}
                onDownload={downloadFile}
                onReset={resetForm}
              />
            </div>
          )}
        </div>
      </div>
      
      <OfflineIndicator />
    </div>
  );
}

export default App;