import React from 'react';
import { WifiOff, Wifi, Clock } from 'lucide-react';
import { useServiceWorker } from '../hooks/useServiceWorker';

const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingExtractions } = useServiceWorker();

  if (isOnline && pendingExtractions === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border-4 border-black p-3 shadow-brutal">
        <div className="flex items-center gap-3">
          {!isOnline ? (
            <>
              <WifiOff className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-sm font-black text-red-600 uppercase">OFFLINE</div>
                <div className="text-xs font-bold text-gray-600">
                  Extractions will be queued
                </div>
              </div>
            </>
          ) : (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm font-black text-green-600 uppercase">ONLINE</div>
                <div className="text-xs font-bold text-gray-600">
                  Connected
                </div>
              </div>
            </>
          )}
        </div>

        {pendingExtractions > 0 && (
          <div className="mt-2 pt-2 border-t-2 border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div className="text-xs font-bold text-gray-700 uppercase">
                {pendingExtractions} QUEUED
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;