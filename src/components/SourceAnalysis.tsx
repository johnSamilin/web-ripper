import React, { useState, useEffect } from 'react';
import { BarChart3, Rss, Mail, ExternalLink, Loader2, Globe, TrendingUp, AlertCircle, EyeOff, Eye, X } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';
import AlertMessage from './AlertMessage';

interface SourceData {
  domain: string;
  count: number;
  articles: Array<{
    title: string;
    url: string;
    extractedAt: string;
  }>;
  rssFeeds: Array<{
    url: string;
    title?: string;
    type: 'rss' | 'atom' | 'json';
  }>;
  newsletters: Array<{
    url: string;
    title?: string;
    type: 'newsletter' | 'subscription';
  }>;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  error?: string;
  ignored?: boolean;
}

interface SourceAnalysisProps {
  onClose: () => void;
  isAuthenticated: boolean;
  hasWebDAV: boolean;
}

const SourceAnalysis: React.FC<SourceAnalysisProps> = ({ onClose, isAuthenticated, hasWebDAV }) => {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [ignoredSources, setIgnoredSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'domain' | 'rss' | 'newsletter'>('count');
  const [showIgnored, setShowIgnored] = useState(false);

  useEffect(() => {
    if (isAuthenticated && hasWebDAV) {
      loadSources();
      loadIgnoreList();
    }
  }, [isAuthenticated, hasWebDAV]);

  const loadSources = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:3001/api/analyze/sources', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load sources');
      }

      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const loadIgnoreList = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/sources/ignore-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIgnoredSources(data.ignoredSources || []);
      }
    } catch (err) {
      console.error('Failed to load ignore list:', err);
    }
  };

  const toggleIgnoreSource = async (domain: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const isCurrentlyIgnored = ignoredSources.includes(domain);
      const action = isCurrentlyIgnored ? 'remove' : 'add';

      const response = await fetch('http://localhost:3001/api/sources/ignore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain, action })
      });

      if (response.ok) {
        const data = await response.json();
        setIgnoredSources(data.ignoredSources || []);
        
        // Update sources list to reflect ignore status
        setSources(prev => prev.map(source => ({
          ...source,
          ignored: data.ignoredSources.includes(source.domain)
        })));
      }
    } catch (err) {
      console.error('Failed to toggle ignore status:', err);
    }
  };

  const clearIgnoreList = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/sources/ignore-list', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIgnoredSources([]);
        setSources(prev => prev.map(source => ({
          ...source,
          ignored: false
        })));
      }
    } catch (err) {
      console.error('Failed to clear ignore list:', err);
    }
  };

  const analyzeAllSources = async () => {
    setAnalyzing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Mark all sources as analyzing
      setSources(prev => prev.map(source => ({ ...source, status: 'analyzing' as const })));

      const response = await fetch('http://localhost:3001/api/analyze/sources/feeds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze sources');
      }

      // Reload sources to get updated data
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sources');
      // Reset status on error
      setSources(prev => prev.map(source => ({ ...source, status: 'pending' as const })));
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeSource = async (domain: string) => {
    setSources(prev => prev.map(source => 
      source.domain === domain ? { ...source, status: 'analyzing' } : source
    ));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`http://localhost:3001/api/analyze/sources/feeds/${encodeURIComponent(domain)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze source');
      }

      const data = await response.json();
      
      // Update the specific source with analysis results
      setSources(prev => prev.map(source => 
        source.domain === domain ? {
          ...source,
          rssFeeds: data.rssFeeds || [],
          newsletters: data.newsletters || [],
          status: 'completed'
        } : source
      ));
    } catch (err) {
      setSources(prev => prev.map(source => 
        source.domain === domain ? {
          ...source,
          status: 'error',
          error: err instanceof Error ? err.message : 'Analysis failed'
        } : source
      ));
    }
  };

  // Filter sources based on search and ignore status
  const filteredSources = sources.filter(source => {
    const matchesSearch = source.domain.toLowerCase().includes(filter.toLowerCase());
    const isIgnored = ignoredSources.includes(source.domain);
    
    if (showIgnored) {
      return matchesSearch && isIgnored;
    } else {
      return matchesSearch && !isIgnored;
    }
  });

  const sortedSources = [...filteredSources].sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return b.count - a.count;
      case 'domain':
        return a.domain.localeCompare(b.domain);
      case 'rss':
        return b.rssFeeds.length - a.rssFeeds.length;
      case 'newsletter':
        return b.newsletters.length - a.newsletters.length;
      default:
        return 0;
    }
  });

  const stats = {
    totalSources: sources.length,
    visibleSources: sources.filter(s => !ignoredSources.includes(s.domain)).length,
    ignoredSources: ignoredSources.length,
    totalArticles: sources.reduce((sum, source) => sum + source.count, 0),
    sourcesWithRSS: sources.filter(s => s.rssFeeds.length > 0).length,
    sourcesWithNewsletter: sources.filter(s => s.newsletters.length > 0).length,
    analyzed: sources.filter(s => s.status === 'completed').length,
    pending: sources.filter(s => s.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <BrutalCard title="SOURCE ANALYSIS" titleBg="bg-green-600">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
            <BarChart3 className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-black text-black mb-2 uppercase">ANALYZE YOUR SOURCES</h3>
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Discover RSS feeds and newsletters from your saved articles
          </p>
        </div>

        {!isAuthenticated && (
          <AlertMessage
            type="error"
            title="AUTHENTICATION REQUIRED"
            message="You must be logged in to analyze sources"
          />
        )}

        {isAuthenticated && !hasWebDAV && (
          <AlertMessage
            type="error"
            title="WEBDAV REQUIRED"
            message="WebDAV storage required to analyze saved articles"
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

          {isAuthenticated && hasWebDAV && sources.length > 0 && (
            <BrutalButton
              onClick={analyzeAllSources}
              disabled={analyzing || loading}
              variant="success"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ANALYZING...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  ANALYZE ALL
                </>
              )}
            </BrutalButton>
          )}
        </div>
      </BrutalCard>

      {loading && (
        <BrutalCard>
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-black text-gray-600 uppercase">LOADING SOURCES...</p>
          </div>
        </BrutalCard>
      )}

      {sources.length > 0 && (
        <>
          {/* Stats Card */}
          <BrutalCard title="SOURCE STATISTICS" titleBg="bg-blue-600">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-black text-black">{stats.visibleSources}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">VISIBLE</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600">{stats.totalArticles}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">ARTICLES</div>
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">{stats.sourcesWithRSS}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">WITH RSS</div>
              </div>
              <div>
                <div className="text-2xl font-black text-purple-600">{stats.sourcesWithNewsletter}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">WITH NEWSLETTER</div>
              </div>
            </div>

            {stats.ignoredSources > 0 && (
              <div className="bg-gray-100 border-4 border-gray-400 p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-bold text-gray-700 uppercase">
                      {stats.ignoredSources} SOURCES IGNORED
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <BrutalButton
                      onClick={() => setShowIgnored(!showIgnored)}
                      size="sm"
                      variant="secondary"
                    >
                      {showIgnored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {showIgnored ? 'SHOW ACTIVE' : 'SHOW IGNORED'}
                    </BrutalButton>
                    <BrutalButton
                      onClick={clearIgnoreList}
                      size="sm"
                      variant="danger"
                    >
                      <X className="w-4 h-4" />
                      CLEAR ALL
                    </BrutalButton>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-100 border-4 border-black p-3">
              <div className="flex justify-between text-xs font-bold text-gray-600 uppercase">
                <span>ANALYZED: {stats.analyzed}</span>
                <span>PENDING: {stats.pending}</span>
              </div>
              <div className="w-full bg-gray-300 border-2 border-black mt-2 h-2">
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${stats.totalSources > 0 ? (stats.analyzed / stats.totalSources) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </BrutalCard>

          {/* Filters and Sorting */}
          <BrutalCard>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                  FILTER SOURCES
                </label>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by domain..."
                  className="brutal-input"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                  SORT BY
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="brutal-input"
                >
                  <option value="count">ARTICLE COUNT</option>
                  <option value="domain">DOMAIN NAME</option>
                  <option value="rss">RSS FEEDS</option>
                  <option value="newsletter">NEWSLETTERS</option>
                </select>
              </div>
            </div>
          </BrutalCard>

          {/* Sources List */}
          <div className="space-y-3">
            {sortedSources.map((source) => {
              const isIgnored = ignoredSources.includes(source.domain);
              
              return (
                <BrutalCard key={source.domain} hover>
                  <div className="space-y-4">
                    {/* Source Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-gray-600" />
                          <h4 className={`font-black text-lg break-words ${isIgnored ? 'text-gray-500' : 'text-black'}`}>
                            {source.domain}
                          </h4>
                          {isIgnored && (
                            <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold uppercase border-2 border-gray-400">
                              IGNORED
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
                          <span>{source.count} ARTICLES</span>
                          {source.rssFeeds.length > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Rss className="w-3 h-3" />
                              {source.rssFeeds.length} RSS
                            </span>
                          )}
                          {source.newsletters.length > 0 && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <Mail className="w-3 h-3" />
                              {source.newsletters.length} NEWSLETTER
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex gap-2">
                        {/* Ignore/Unignore Button */}
                        <BrutalButton
                          onClick={() => toggleIgnoreSource(source.domain)}
                          size="sm"
                          variant={isIgnored ? "secondary" : "warning"}
                          title={isIgnored ? "Show this source" : "Hide this source"}
                        >
                          {isIgnored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {isIgnored ? 'SHOW' : 'HIDE'}
                        </BrutalButton>

                        {/* Analysis Button */}
                        {source.status === 'pending' && (
                          <BrutalButton
                            onClick={() => analyzeSource(source.domain)}
                            size="sm"
                            variant="primary"
                          >
                            <TrendingUp className="w-4 h-4" />
                            ANALYZE
                          </BrutalButton>
                        )}

                        {source.status === 'analyzing' && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border-2 border-yellow-500">
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                            <span className="text-xs font-bold text-yellow-700 uppercase">
                              ANALYZING
                            </span>
                          </div>
                        )}

                        {source.status === 'completed' && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border-2 border-green-500">
                            <BarChart3 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold text-green-700 uppercase">
                              ANALYZED
                            </span>
                          </div>
                        )}

                        {source.status === 'error' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border-2 border-red-500">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-bold text-red-700 uppercase">
                                ERROR
                              </span>
                            </div>
                            <BrutalButton
                              onClick={() => analyzeSource(source.domain)}
                              size="sm"
                              variant="danger"
                            >
                              RETRY
                            </BrutalButton>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Message */}
                    {source.error && (
                      <AlertMessage type="error" message={source.error} />
                    )}

                    {/* RSS Feeds */}
                    {source.rssFeeds.length > 0 && (
                      <div className="bg-green-50 border-4 border-green-500 p-4">
                        <h5 className="font-black text-green-800 text-sm uppercase mb-3 flex items-center gap-2">
                          <Rss className="w-4 h-4" />
                          RSS FEEDS ({source.rssFeeds.length})
                        </h5>
                        <div className="space-y-2">
                          {source.rssFeeds.map((feed, index) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-green-800 text-sm break-words">
                                  {feed.title || 'RSS Feed'}
                                </div>
                                <div className="text-xs font-bold text-green-600 break-all">
                                  {feed.url}
                                </div>
                                <div className="text-xs font-bold text-green-600 uppercase">
                                  {feed.type}
                                </div>
                              </div>
                              <a
                                href={feed.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 p-2 bg-green-600 hover:bg-green-700 text-white border-2 border-black transition-all duration-200"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Newsletters */}
                    {source.newsletters.length > 0 && (
                      <div className="bg-purple-50 border-4 border-purple-500 p-4">
                        <h5 className="font-black text-purple-800 text-sm uppercase mb-3 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          NEWSLETTERS ({source.newsletters.length})
                        </h5>
                        <div className="space-y-2">
                          {source.newsletters.map((newsletter, index) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-purple-800 text-sm break-words">
                                  {newsletter.title || 'Newsletter'}
                                </div>
                                <div className="text-xs font-bold text-purple-600 break-all">
                                  {newsletter.url}
                                </div>
                                <div className="text-xs font-bold text-purple-600 uppercase">
                                  {newsletter.type}
                                </div>
                              </div>
                              <a
                                href={newsletter.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 p-2 bg-purple-600 hover:bg-purple-700 text-white border-2 border-black transition-all duration-200"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Articles Preview */}
                    <div className="bg-gray-50 border-4 border-gray-400 p-4">
                      <h5 className="font-black text-gray-800 text-sm uppercase mb-3">
                        RECENT ARTICLES ({Math.min(source.articles.length, 3)})
                      </h5>
                      <div className="space-y-2">
                        {source.articles.slice(0, 3).map((article, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-800 text-xs break-words leading-tight">
                                {article.title}
                              </div>
                              <div className="text-xs font-bold text-gray-500">
                                {new Date(article.extractedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-1 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                        {source.articles.length > 3 && (
                          <div className="text-xs font-bold text-gray-500 text-center">
                            +{source.articles.length - 3} more articles
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </BrutalCard>
              );
            })}
          </div>

          {sortedSources.length === 0 && (filter || showIgnored) && (
            <BrutalCard>
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-black text-gray-600 uppercase">
                  {showIgnored ? 'NO IGNORED SOURCES' : 'NO SOURCES FOUND'}
                </p>
                <p className="text-sm font-bold text-gray-500 uppercase">
                  {showIgnored ? 'No sources have been ignored yet' : 'Try adjusting your search filter'}
                </p>
              </div>
            </BrutalCard>
          )}
        </>
      )}

      {!loading && sources.length === 0 && isAuthenticated && hasWebDAV && (
        <BrutalCard>
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-black text-gray-600 uppercase">NO SOURCES FOUND</p>
            <p className="text-sm font-bold text-gray-500 uppercase">
              Extract some articles first to analyze sources
            </p>
          </div>
        </BrutalCard>
      )}
    </div>
  );
};

export default SourceAnalysis;