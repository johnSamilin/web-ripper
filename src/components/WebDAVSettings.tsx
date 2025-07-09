import React, { useState } from 'react';
import { Cloud, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalInput from './BrutalInput';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';

interface WebDAVSettingsData {
  url: string;
  username: string;
  hasPassword: boolean;
  isConfigured: boolean;
}

interface WebDAVFormData {
  url: string;
  username: string;
  password: string;
}

interface WebDAVSettingsProps {
  settings: WebDAVSettingsData;
  onSave: (formData: WebDAVFormData) => void;
  loading: boolean;
  error: string;
  success: string;
}

const WebDAVSettings: React.FC<WebDAVSettingsProps> = ({
  settings,
  onSave,
  loading,
  error,
  success
}) => {
  const [formData, setFormData] = useState<WebDAVFormData>({
    url: settings.url,
    username: settings.username,
    password: ''
  });
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState('');
  const [cleanupSuccess, setCleanupSuccess] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCleanupCSS = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setCleanupLoading(true);
    setCleanupError('');
    setCleanupSuccess('');
    setShowConfirmation(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCleanupError('Authentication required');
        return;
      }

      console.log('🧹 Starting CSS cleanup request...');

      const response = await fetch('http://localhost:3001/api/cleanup-css', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Response status: ${response.status}`);

      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok) {
        setCleanupSuccess(
          `CSS cleanup completed! Processed ${data.statistics.processedFiles} files, ` +
          `${data.statistics.backupFiles} backups created, ` +
          `${data.statistics.errorFiles} errors.`
        );
        // Clear success message after 10 seconds
        setTimeout(() => setCleanupSuccess(''), 10000);
      } else {
        setCleanupError(data.error || 'CSS cleanup failed');
        if (data.details) {
          console.error('Cleanup error details:', data.details);
        }
      }
    } catch (error) {
      console.error('CSS cleanup network error:', error);
      setCleanupError('Network error occurred during cleanup. Please check your connection and try again.');
    } finally {
      setCleanupLoading(false);
    }
  };

  const cancelCleanup = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-6">
      <BrutalCard title="WEBDAV STORAGE" titleBg="bg-blue-600">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${settings.isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-bold text-gray-700 uppercase">
              {settings.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
            </span>
          </div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Files will be {settings.isConfigured ? 'uploaded to WebDAV' : 'downloaded locally'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
              WEBDAV URL
            </label>
            <BrutalInput
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://your-webdav-server.com/dav"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
              USERNAME
            </label>
            <BrutalInput
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="webdav-username"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
              PASSWORD
            </label>
            <BrutalInput
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={settings.hasPassword ? "••••••••" : "webdav-password"}
            />
          </div>

          {error && (
            <AlertMessage type="error" message={error} />
          )}

          {success && (
            <AlertMessage type="success" message={success} />
          )}

          <BrutalButton
            type="submit"
            disabled={loading}
            className="w-full"
            variant="primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Cloud className="w-5 h-5" />
                SAVE SETTINGS
              </>
            )}
          </BrutalButton>
        </form>

        <div className="mt-6 pt-4 border-t-4 border-gray-200">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide text-center">
            Files will be stored in /web-ripper/ directory
          </p>
        </div>
      </BrutalCard>

      {settings.isConfigured && (
        <BrutalCard title="CSS CLEANUP" titleBg="bg-red-600">
          <div className="mb-4">
            <h3 className="text-lg font-black text-black mb-2 uppercase">REMOVE CSS FROM SAVED FILES</h3>
            <p className="text-sm font-bold text-gray-700 mb-4">
              This will scan all your saved HTML files and remove any CSS styling, converting them to plain HTML format.
            </p>
            
            <div className="bg-yellow-100 border-4 border-yellow-500 p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-yellow-800 text-sm uppercase mb-2">⚠️ WARNING</h4>
                  <ul className="text-xs font-bold text-yellow-700 space-y-1">
                    <li>• This will modify ALL HTML files in your WebDAV storage</li>
                    <li>• Original files will be backed up with .backup extension</li>
                    <li>• All CSS styling will be permanently removed</li>
                    <li>• Files will be converted to plain HTML format</li>
                    <li>• This process may take several minutes for large collections</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {cleanupError && (
            <div className="mb-4">
              <AlertMessage type="error" message={cleanupError} />
            </div>
          )}

          {cleanupSuccess && (
            <div className="mb-4">
              <AlertMessage type="success" message={cleanupSuccess} />
            </div>
          )}

          {showConfirmation ? (
            <div className="space-y-3">
              <div className="bg-red-100 border-4 border-red-500 p-4">
                <h4 className="font-black text-red-800 text-sm uppercase mb-2">FINAL CONFIRMATION</h4>
                <p className="text-xs font-bold text-red-700 mb-3">
                  Are you absolutely sure you want to remove CSS from ALL your saved HTML files? 
                  This action will modify your entire collection.
                </p>
                <div className="flex gap-3">
                  <BrutalButton
                    onClick={handleCleanupCSS}
                    disabled={cleanupLoading}
                    variant="danger"
                    size="sm"
                  >
                    {cleanupLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        CLEANING...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        YES, REMOVE CSS
                      </>
                    )}
                  </BrutalButton>
                  <BrutalButton
                    onClick={cancelCleanup}
                    disabled={cleanupLoading}
                    variant="secondary"
                    size="sm"
                  >
                    CANCEL
                  </BrutalButton>
                </div>
              </div>
            </div>
          ) : (
            <BrutalButton
              onClick={handleCleanupCSS}
              disabled={cleanupLoading}
              className="w-full"
              variant="danger"
            >
              <Trash2 className="w-5 h-5" />
              REMOVE CSS FROM ALL FILES
            </BrutalButton>
          )}

          <div className="mt-4 pt-4 border-t-4 border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide text-center">
              Backup files will be created before modification
            </p>
          </div>
        </BrutalCard>
      )}
    </div>
  );
};

export default WebDAVSettings;