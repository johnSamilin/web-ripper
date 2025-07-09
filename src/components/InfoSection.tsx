import React from 'react';
import { FileText, Download, Cloud, Zap, UserPlus } from 'lucide-react';
import InfoCard from './InfoCard';

interface InfoSectionProps {
  isAuthenticated: boolean;
  hasWebDAV: boolean;
}

const InfoSection: React.FC<InfoSectionProps> = ({ isAuthenticated, hasWebDAV }) => {
  return (
    <div className="space-y-3">
      <InfoCard
        icon={<FileText className="w-6 h-6 text-white" />}
        title="CLEAN KILL"
        description="DESTROYS ADS & CLUTTER"
        iconBg="bg-red-500"
      />

      <InfoCard
        icon={isAuthenticated && hasWebDAV ? <Cloud className="w-6 h-6 text-black" /> : <Download className="w-6 h-6 text-black" />}
        title={isAuthenticated && hasWebDAV ? 'CLOUD STORAGE' : 'INSTANT LOOT'}
        description={isAuthenticated && hasWebDAV ? 'UPLOADS TO WEBDAV' : 'MARKDOWN IN SECONDS'}
        iconBg="bg-yellow-400"
      />

      <InfoCard
        icon={<Zap className="w-6 h-6 text-white" />}
        title="NO MERCY"
        description="ANY SITE • ANY TARGET"
        iconBg="bg-blue-600"
      />

      {!isAuthenticated && (
        <InfoCard
          icon={<UserPlus className="w-6 h-6 text-white" />}
          title="UPGRADE POWER"
          description="LOGIN FOR WEBDAV STORAGE"
          iconBg="bg-green-600"
        />
      )}
    </div>
  );
};

export default InfoSection;