import React, { useState, useEffect } from 'react';
import { Settings, Zap, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';

interface ExtractionMode {
  available: boolean;
  description: string;
  features: string[];
  performance: string;
  version?: string;
  error?: string;
  path?: string;
}

interface ExtractionInfo {
  currentMode: string;
  supportedModes: string[];
  modes: Record<string, ExtractionMode>;
}

interface ExtractionModeSelectorProps {
  isAuthenticated: boolean;
  onClose: () => void;
}

const ExtractionModeSelector: React.FC<ExtractionModeSelectorProps> = ({
  isAuthenticated,
  onClose
}) => {
  const [info, setInfo] = useState<ExtractionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadExtractionInfo();
  }, []);

  const loadExtractionInfo = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/extraction/info');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load extraction info');
      }

      const data = await response.json();
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load extraction info');
    } finally {
      setLoading(false);
    }
  };

  const changeExtractionMode = async (mode: string) => {
    if (!isAuthenticated) {
      setError('Authentication required to change extraction mode');
      return;
    }

    setChanging(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/extraction/mode', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change extraction mode');
      }

      const data = await response.json();
      setSuccess(data.message);
      
      // Reload info to get updated current mode
      await loadExtractionInfo();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change extraction mode');
    } finally {
      setChanging(false);
    }
  };

  const getModeIcon = (mode: string, modeInfo: ExtractionMode) => {
    if (!modeInfo.available) {
      return <AlertCircle className="w-6 h-6 text-red-600" />;
    }
    
    if (info?.currentMode === mode) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    
    return mode === 'monolith' ? 
      <ExternalLink className="w-6 h-6 text-blue-600" /> : 
      <Zap className="w-6 h-6 text-yellow-600" />;
  };

  const getModeColor = (mode: string, modeInfo: ExtractionMode) => {
    if (!modeInfo.available) return 'border-red-500 bg-red-50';
    if (info?.currentMode === mode) return 'border-green-500 bg-green-50';
    return 'border-gray-400 bg-white hover:bg-gray-50';
  };

  return (
    <div className="space-y-6">
      <BrutalCard title="EXTRACTION MODES" titleBg="bg-purple-600">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
            <Settings className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-black text-black mb-2 uppercase">CONFIGURE EXTRACTION</h3>
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Choose how content is extracted from websites
          </p>
        </div>

        {!isAuthenticated && (
          <AlertMessage
            type="error"
            title="AUTHENTICATION REQUIRED"
            message="You must be logged in to change extraction modes"
          />
        )}

        {error && (
          <AlertMessage type="error" message={error} />
        )}

        {success && (
          <AlertMessage type="success" message={success} />
        )}

        <div className="flex justify-between">
          <BrutalButton
            onClick={onClose}
            variant="secondary"
          >
            CLOSE
          </BrutalButton>

          <BrutalButton
            onClick={loadExtractionInfo}
            disabled={loading}
            variant="primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                LOADING...
              </>
            ) : (
              'REFRESH'
            )}
          </BrutalButton>
        </div>
      </BrutalCard>

      {loading && (
        <BrutalCard>
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-black text-gray-600 uppercase">LOADING EXTRACTION INFO...</p>
          </div>
        </BrutalCard>
      )}

      {info && (
        <div className="space-y-4">
          {info.supportedModes.map((mode) => {
            const modeInfo = info.modes[mode];
            const isCurrentMode = info.currentMode === mode;
            const isAvailable = modeInfo.available;

            return (
              <BrutalCard key={mode} hover={isAvailable && !isCurrentMode}>
                <div className={`border-4 ${getModeColor(mode, modeInfo)} p-4 transition-all duration-200`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getModeIcon(mode, modeInfo)}
                        <div>
                          <h4 className="font-black text-black text-lg uppercase">
                            {mode}
                            {isCurrentMode && (
                              <span className="ml-2 inline-block px-2 py-1 bg-green-500 text-white text-xs font-bold uppercase border-2 border-black">
                                ACTIVE
                              </span>
                            )}
                            {!isAvailable && (
                              <span className="ml-2 inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold uppercase border-2 border-black">
                                UNAVAILABLE
                              </span>
                            )}
                          </h4>
                          <p className="text-sm font-bold text-gray-600 uppercase">
                            Performance: {modeInfo.performance}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-gray-700 mb-3">
                        {modeInfo.description}
                      </p>

                      <div className="mb-3">
                        <h5 className="text-xs font-black text-gray-800 uppercase mb-2">Features:</h5>
                        <div className="flex flex-wrap gap-1">
                          {modeInfo.features.map((feature, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-gray-200 text-gray-800 text-xs font-bold uppercase border-2 border-gray-400"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {modeInfo.version && (
                        <div className="text-xs font-bold text-gray-600">
                          Version: {modeInfo.version}
                        </div>
                      )}

                      {modeInfo.path && (
                        <div className="text-xs font-bold text-gray-600">
                          Path: {modeInfo.path}
                        </div>
                      )}

                      {modeInfo.error && (
                        <div className="mt-2">
                          <AlertMessage type="error" message={modeInfo.error} />
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {isAvailable && !isCurrentMode && isAuthenticated && (
                        <BrutalButton
                          onClick={() => changeExtractionMode(mode)}
                          disabled={changing}
                          size="sm"
                          variant="primary"
                        >
                          {changing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              CHANGING...
                            </>
                          ) : (
                            'ACTIVATE'
                          )}
                        </BrutalButton>
                      )}

                      {!isAvailable && mode === 'monolith' && (
                        <div className="text-center">
                          <div className="text-xs font-bold text-red-600 uppercase mb-2">
                            INSTALL REQUIRED
                          </div>
                          <a
                            href="https://github.com/Y2Z/monolith"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 uppercase"
                          >
                            <ExternalLink className="w-3 h-3" />
                            INSTALL GUIDE
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </BrutalCard>
            );
          })}
        </div>
      )}

      {info && (
        <BrutalCard title="EXTRACTION COMPARISON" titleBg="bg-blue-600">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-bold">
              <thead>
                <tr className="border-b-4 border-black">
                  <th className="text-left p-2 font-black uppercase">Feature</th>
                  <th className="text-center p-2 font-black uppercase">Cheerio</th>
                  <th className="text-center p-2 font-black uppercase">Monolith</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-gray-300">
                  <td className="p-2 font-black uppercase">Speed</td>
                  <td className="text-center p-2 text-green-600">Fast</td>
                  <td className="text-center p-2 text-yellow-600">Medium</td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="p-2 font-black uppercase">Complex Sites</td>
                  <td className="text-center p-2 text-yellow-600">Good</td>
                  <td className="text-center p-2 text-green-600">Excellent</td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="p-2 font-black uppercase">Self-Contained</td>
                  <td className="text-center p-2 text-green-600">Yes</td>
                  <td className="text-center p-2 text-green-600">Yes</td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="p-2 font-black uppercase">Dependencies</td>
                  <td className="text-center p-2 text-green-600">None</td>
                  <td className="text-center p-2 text-red-600">External Binary</td>
                </tr>
                <tr>
                  <td className="p-2 font-black uppercase">Resource Usage</td>
                  <td className="text-center p-2 text-green-600">Low</td>
                  <td className="text-center p-2 text-yellow-600">Medium</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BrutalCard>
      )}
    </div>
  );
};

export default ExtractionModeSelector;