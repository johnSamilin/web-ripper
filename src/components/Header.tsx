import React from 'react';
import { Skull, Settings, LogOut, Cloud, UserPlus, Upload, BarChart3, Home, Zap } from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  email: string;
  hasWebDAV: boolean;
}

interface HeaderProps {
  isAuthenticated: boolean;
  user: UserData | null;
  onShowSettings: () => void;
  onShowAuth: () => void;
  onLogout: () => void;
  onShowPocketImport: () => void;
  onShowSourceAnalysis: () => void;
  onShowLanding: () => void;
  onShowExtractionModes: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  user,
  onShowSettings,
  onShowAuth,
  onLogout,
  onShowPocketImport,
  onShowSourceAnalysis,
  onShowLanding,
  onShowExtractionModes
}) => {
  return (
    <div className="bg-white border-b-4 border-black relative z-10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onShowLanding}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 bg-black border-4 border-red-500 flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-300">
                <Skull className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-black uppercase tracking-wider transform skew-x-neg5">WEB RIPPER</h1>
                {isAuthenticated ? (
                  <p className="text-sm font-bold text-red-600 uppercase tracking-widest">@{user?.username}</p>
                ) : (
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">ANONYMOUS MODE</p>
                )}
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowLanding}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-3 border-4 border-black transition-all duration-200"
              title="Back to Landing Page"
            >
              <Home className="w-5 h-5" />
            </button>
            
            {isAuthenticated ? (
              <>
                {user?.hasWebDAV && (
                  <div className="flex items-center gap-1 bg-green-100 border-2 border-green-500 px-2 py-1">
                    <Cloud className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700 uppercase">WEBDAV</span>
                  </div>
                )}
                <button
                  onClick={onShowExtractionModes}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-3 border-4 border-black transition-all duration-200"
                  title="Extraction Modes"
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button
                  onClick={onShowSourceAnalysis}
                  className="bg-green-600 hover:bg-green-700 text-white font-black py-2 px-3 border-4 border-black transition-all duration-200"
                  title="Analyze Sources"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={onShowPocketImport}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-3 border-4 border-black transition-all duration-200"
                  title="Import Pocket Articles"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <button
                  onClick={onShowSettings}
                  className="bg-gray-200 hover:bg-gray-300 text-black font-black py-2 px-3 border-4 border-black transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={onLogout}
                  className="bg-red-500 hover:bg-red-600 text-white font-black py-2 px-3 border-4 border-black transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={onShowAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-4 border-4 border-black transition-all duration-200 flex items-center gap-2 uppercase tracking-wider"
              >
                <UserPlus className="w-5 h-5" />
                LOGIN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;