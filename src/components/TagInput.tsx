import React, { useState, useEffect } from 'react';
import { Tag, X, Sparkles, Loader2 } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onSuggestTags?: (title: string, description: string, url: string) => Promise<string[]>;
  title?: string;
  description?: string;
  url?: string;
  disabled?: boolean;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  onSuggestTags,
  title = '',
  description = '',
  url = '',
  disabled = false,
  placeholder = 'Add tags...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSuggestTags = async () => {
    if (!onSuggestTags || !title || !url) return;
    
    setSuggestLoading(true);
    try {
      const suggestedTags = await onSuggestTags(title, description, url);
      // Add suggested tags that aren't already present
      const newTags = suggestedTags.filter(tag => !tags.includes(tag));
      if (newTags.length > 0) {
        onTagsChange([...tags, ...newTags]);
      }
    } catch (error) {
      console.error('Failed to get tag suggestions:', error);
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <div className="tag-input">
      <div className="tag-input-container brutal-input">
        <div className="tag-list">
          {tags.map((tag, index) => (
            <span key={index} className="brutal-tag">
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="tag-remove"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="tag-remove-icon" />
                </button>
              )}
            </span>
          ))}
        </div>
        
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag(inputValue);
              }
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="tag-input-field"
          />
        )}
      </div>

      {onSuggestTags && title && url && !disabled && (
        <button
          type="button"
          onClick={handleSuggestTags}
          disabled={suggestLoading}
          className="brutal-button brutal-button-primary tag-suggest-button"
        >
          {suggestLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              GENERATING...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI SUGGEST
            </>
          )}
        </button>
      )}

      <style jsx>{`
        .tag-input {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tag-input-container {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          min-height: 3rem;
          padding: 0.75rem !important;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none !important;
          color: #facc15;
          cursor: pointer;
          padding: 0;
          margin-left: 0.25rem;
        }

        .tag-remove:hover {
          color: #ef4444;
        }

        .tag-remove-icon {
          width: 0.75rem;
          height: 0.75rem;
        }

        .tag-input-field {
          flex: 1;
          min-width: 120px;
          background: transparent !important;
          border: none !important;
          outline: none;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          color: #000000;
        }

        .tag-input-field::placeholder {
          color: #6b7280;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tag-suggest-button {
          background: #7c3aed !important;
          font-size: 0.75rem !important;
          padding: 0.5rem 1rem !important;
        }

        .tag-suggest-button:hover {
          background: #8b5cf6 !important;
        }

        .tag-suggest-button:disabled {
          background: #9ca3af !important;
        }
      `}</style>
    </div>
  );
};

export default TagInput;