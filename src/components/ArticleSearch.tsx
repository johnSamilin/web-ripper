import React, { useState, useEffect } from 'react';
import { Search, Calendar, Tag, FileText, ExternalLink, Loader2, Filter, X, Clock, Globe } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';
import BrutalInput from './BrutalInput';
import AlertMessage from './AlertMessage';

interface Article {
  title: string;
  description: string;
  url: string;
  domain: string;
  extractedAt: string;
  extractedBy: string;
  wordCount: number;
  imageCount: number;
  tags: string[];
  userTags: string[];
  filename: string;
  datePath: string;
  format: string;
  extractionMethod: string;
}

interface ArticleSearchProps {
  onClose: () => void;
  isAuthenticated: boolean;
  hasWebDAV: boolean;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getReadingTime = (wordCount: number) => {
  return Math.ceil(wordCount / 200); // Assume 200 WPM
};

const ArticleSearch: React.FC<ArticleSearchProps> = ({ onClose, isAuthenticated, hasWebDAV }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'wordCount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated && hasWebDAV) {
      loadArticles();
    }
  }, [isAuthenticated, hasWebDAV]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedTags, dateFrom, dateTo, sortBy, sortOrder]);

  const loadArticles = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/articles/search', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load articles');
      }

      const data = await response.json();
      setArticles(data.articles || []);
      
      // Extract all unique tags
      const allTags = new Set<string>();
      data.articles.forEach((article: Article) => {
        article.tags?.forEach(tag => allTags.add(tag));
        article.userTags?.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags).sort());
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Text search (fuzzy matching on title and description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.domain.toLowerCase().includes(query)
      );
    }

    // Tag filtering
    if (selectedTags.length > 0) {
      filtered = filtered.filter(article => {
        const articleTags = [...(article.tags || []), ...(article.userTags || [])];
        return selectedTags.some(tag => articleTags.includes(tag));
      });
    }

    // Date filtering
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(article => 
        new Date(article.extractedAt) >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(article => 
        new Date(article.extractedAt) <= toDate
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.extractedAt).getTime() - new Date(b.extractedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'wordCount':
          comparison = a.wordCount - b.wordCount;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredArticles(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setSortBy('date');
    setSortOrder('desc');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReadingTime = (wordCount: number) => {
    return Math.ceil(wordCount / 200); // Assume 200 WPM
  };

  return (
    <div className="space-y-6">
      <BrutalCard title="ARTICLE SEARCH" titleBg="bg-blue-600">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
            <Search className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-black text-black mb-2 uppercase">FIND YOUR ARTICLES</h3>
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Search and filter your saved content
          </p>
        </div>

        {!isAuthenticated && (
          <AlertMessage
            type="error"
            title="AUTHENTICATION REQUIRED"
            message="You must be logged in to search articles"
          />
        )}

        {isAuthenticated && !hasWebDAV && (
          <AlertMessage
            type="error"
            title="WEBDAV REQUIRED"
            message="WebDAV storage required to search saved articles"
          />
        )}

        {error && (
          <AlertMessage type="error" message={error} />
        )}

        <div className="flex justify-between gap-3">
          <BrutalButton
            onClick={onClose}
            variant="secondary"
          >
            CLOSE
          </BrutalButton>

          {isAuthenticated && hasWebDAV && (
            <div className="flex gap-2">
              <BrutalButton
                onClick={() => setShowFilters(!showFilters)}
                variant="warning"
              >
                <Filter className="w-5 h-5" />
                {showFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'}
              </BrutalButton>
              
              <BrutalButton
                onClick={loadArticles}
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
          )}
        </div>
      </BrutalCard>

      {loading && (
        <BrutalCard>
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-black text-gray-600 uppercase">LOADING ARTICLES...</p>
          </div>
        </BrutalCard>
      )}

      {/* Search and Filters */}
      {isAuthenticated && hasWebDAV && !loading && (
        <>
          {/* Search Bar */}
          <BrutalCard>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                  SEARCH ARTICLES
                </label>
                <BrutalInput
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, description, or domain..."
                  icon={<Search />}
                />
              </div>

              {showFilters && (
                <div className="space-y-4 pt-4 border-t-4 border-gray-200">
                  {/* Date Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                        FROM DATE
                      </label>
                      <BrutalInput
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                        TO DATE
                      </label>
                      <BrutalInput
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                        SORT BY
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="brutal-input"
                      >
                        <option value="date">DATE EXTRACTED</option>
                        <option value="title">TITLE</option>
                        <option value="wordCount">WORD COUNT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                        ORDER
                      </label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="brutal-input"
                      >
                        <option value="desc">NEWEST FIRST</option>
                        <option value="asc">OLDEST FIRST</option>
                      </select>
                    </div>
                  </div>

                  {/* Tag Filters */}
                  {availableTags.length > 0 && (
                    <div>
                      <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                        FILTER BY TAGS
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`inline-block px-3 py-1 text-xs font-bold uppercase border-2 transition-all duration-200 ${
                              selectedTags.includes(tag)
                                ? 'bg-black text-white border-yellow-400'
                                : 'bg-gray-200 text-black border-gray-400 hover:bg-gray-300'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clear Filters */}
                  <div className="flex justify-end">
                    <BrutalButton
                      onClick={clearFilters}
                      size="sm"
                      variant="danger"
                    >
                      <X className="w-4 h-4" />
                      CLEAR FILTERS
                    </BrutalButton>
                  </div>
                </div>
              )}
            </div>
          </BrutalCard>

          {/* Results Summary */}
          {articles.length > 0 && (
            <BrutalCard title="SEARCH RESULTS" titleBg="bg-green-600">
              <div className="text-center">
                <div className="text-2xl font-black text-black mb-2">
                  {filteredArticles.length} / {articles.length}
                </div>
                <div className="text-sm font-bold text-gray-600 uppercase">
                  ARTICLES FOUND
                </div>
                {selectedTags.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-black text-gray-700 uppercase mb-2">FILTERED BY TAGS:</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {selectedTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 bg-black text-white text-xs font-bold uppercase border-2 border-yellow-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </BrutalCard>
          )}

          {/* Articles List */}
          <div className="space-y-3">
            {filteredArticles.map((article, index) => (
              <BrutalCard key={`${article.filename}-${index}`} hover>
                <div className="space-y-3">
                  {/* Article Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-black text-lg leading-tight break-words mb-2">
                        {article.title}
                      </h4>
                      
                      {article.description && (
                        <p className="text-sm font-bold text-gray-700 mb-3 leading-relaxed">
                          {article.description.length > 200 
                            ? `${article.description.substring(0, 200)}...`
                            : article.description
                          }
                        </p>
                      )}

                      {/* Article Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.extractedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {article.domain}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {article.wordCount.toLocaleString()} words
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getReadingTime(article.wordCount)} min read
                        </div>
                      </div>

                      {/* Tags */}
                      {(article.tags?.length > 0 || article.userTags?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {[...(article.tags || []), ...(article.userTags || [])].map((tag, tagIndex) => (
                            <span
                              key={`${tag}-${tagIndex}`}
                              className="inline-block px-2 py-1 bg-gray-200 text-black text-xs font-bold uppercase border-2 border-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Technical Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-500">
                        <span>FORMAT: {article.format?.toUpperCase() || 'HTML'}</span>
                        <span>METHOD: {article.extractionMethod?.toUpperCase() || 'UNKNOWN'}</span>
                        {article.imageCount > 0 && (
                          <span>IMAGES: {article.imageCount}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-black transition-all duration-200"
                        title="View Original"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </BrutalCard>
            ))}
          </div>

          {filteredArticles.length === 0 && articles.length > 0 && (
            <BrutalCard>
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-black text-gray-600 uppercase">NO ARTICLES FOUND</p>
                <p className="text-sm font-bold text-gray-500 uppercase">
                  Try adjusting your search filters
                </p>
              </div>
            </BrutalCard>
          )}

          {!loading && articles.length === 0 && (
            <BrutalCard>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-black text-gray-600 uppercase">NO ARTICLES SAVED</p>
                <p className="text-sm font-bold text-gray-500 uppercase">
                  Extract some articles first to search them
                </p>
              </div>
            </BrutalCard>
          )}
        </>
      )}
    </div>
  );
};

export default ArticleSearch;