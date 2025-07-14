import React, { useState } from 'react';
import { Target, Zap, Crosshair, Loader2 } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalInput from './BrutalInput';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';
import TagInput from './TagInput';
import { useSharedUrl } from '../hooks/useSharedUrl';

interface ExtractionFormProps {
  onSubmit: (url: string, tags: string[]) => void;
  loading: boolean;
  error: string;
  isAuthenticated: boolean;
  hasWebDAV: boolean;
}

const ExtractionForm: React.FC<ExtractionFormProps> = ({ 
  onSubmit, 
  loading, 
  error, 
  isAuthenticated, 
  hasWebDAV 
}) => {
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const { sharedUrl } = useSharedUrl();

  // Auto-fill URL from shared content
  React.useEffect(() => {
    if (sharedUrl && !url) {
      setUrl(sharedUrl);
    }
  }, [sharedUrl, url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), tags);
    }
  };

  const handleSuggestTags = async (title: string, description: string, url: string): Promise<string[]> => {
    try {
      const response = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({ title, description, url })
      });

      if (!response.ok) {
        throw new Error('Failed to get tag suggestions');
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Tag suggestion error:', error);
      return [];
    }
  };

  return (
    <BrutalCard title="TARGET ACQUIRED" titleBg="bg-red-500" hover>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-yellow-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
          <Target className="w-8 h-8 text-black" />
        </div>
        <h3 className="text-lg font-black text-black mb-2 uppercase">LOCK & LOAD</h3>
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">ENTER TARGET URL</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
            VICTIM URL
          </label>
          <BrutalInput
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={sharedUrl ? "Shared URL loaded..." : "https://victim-site.com/article"}
            disabled={loading}
            icon={<Crosshair />}
          />
          {sharedUrl && (
            <p className="text-xs font-bold text-green-600 mt-1 uppercase">
              ✓ URL shared from another app
            </p>
          )}
        </div>


        {isAuthenticated && hasWebDAV && (
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
              TAGS (OPTIONAL)
            </label>
            <BrutalInput
              type="text"
              value={tags.join(', ')}
              onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
              placeholder="Add tags separated by commas..."
              disabled={loading}
            />
            <p className="text-xs font-bold text-gray-600 mt-2 uppercase">
              Separate multiple tags with commas
            </p>
          </div>
        )}

        {error && (
          <AlertMessage 
            type="error" 
            title="MISSION FAILED" 
            message={error} 
          />
        )}

        <BrutalButton
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full"
          variant="primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              RIPPING...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              DESTROY & EXTRACT
            </>
          )}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
};

export default ExtractionForm;