import React from 'react';
import { CheckCircle, Download, Globe, FileText, Cloud, Tag, Image } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';

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

interface ExtractionResultProps {
  result: ExtractResult;
  onDownload: () => void;
  onReset: () => void;
}

const ExtractionResult: React.FC<ExtractionResultProps> = ({ 
  result, 
  onDownload, 
  onReset 
}) => {
  return (
    <BrutalCard title="MISSION COMPLETE" titleBg="bg-green-500">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
          <CheckCircle className="w-8 h-8 text-black" />
        </div>
        <h3 className="text-lg font-black text-black mb-2 uppercase">TARGET ELIMINATED</h3>
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          {result.format === 'html' ? 'HTML GENERATED' : 'CONTENT EXTRACTED'}
        </p>
      </div>

      <div className="bg-gray-100 border-4 border-black p-4 mb-6">
        <h4 className="font-black text-black mb-2 text-sm leading-tight uppercase">{result.title}</h4>
        {result.description && (
          <p className="text-xs font-bold text-gray-700 mb-3 leading-relaxed">{result.description}</p>
        )}
        
        {result.tags && result.tags.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-2">
              <Tag className="w-3 h-3 text-gray-600" />
              <span className="text-xs font-black text-gray-600 uppercase">TAGS</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {result.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-black text-white text-xs font-bold uppercase border-2 border-yellow-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600 uppercase">
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {new URL(result.url).hostname}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {result.wordCount.toLocaleString()} WORDS
          </div>
          {result.imageCount !== undefined && (
            <div className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              {result.imageCount} IMAGES
            </div>
          )}
          {result.format && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {result.format.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {result.webdav && (
        <div className="mb-6">
          <AlertMessage
            type="success"
            title="UPLOADED TO WEBDAV"
            message={result.webdav.path}
          />
          {result.webdav.metadataPath && (
            <div className="mt-2">
              <AlertMessage
                type="success"
                title="METADATA SAVED"
                message={result.webdav.metadataPath}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {!result.webdav && (
          <BrutalButton
            onClick={onDownload}
            className="w-full"
            variant="success"
          >
            <Download className="w-5 h-5" />
            DOWNLOAD {result.format === 'html' ? 'HTML' : 'LOOT'}
          </BrutalButton>
        )}
        <BrutalButton
          onClick={onReset}
          className="w-full"
          variant="warning"
        >
          FIND NEW TARGET
        </BrutalButton>
      </div>
    </BrutalCard>
  );
};

export default ExtractionResult;