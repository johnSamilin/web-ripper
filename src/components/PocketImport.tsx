import React, { useState, useRef } from 'react';
import { Upload, FileText, ExternalLink, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import BrutalCard from './BrutalCard';
import BrutalButton from './BrutalButton';
import BrutalInput from './BrutalInput';
import AlertMessage from './AlertMessage';

interface PocketArticle {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  tags?: string[];
  dateAdded?: string;
  wordCount?: number;
  status: 'pending' | 'extracting' | 'extracted' | 'failed';
  error?: string;
  originalStatus?: string; // archive, unread, etc.
}

interface PocketImportProps {
  onClose: () => void;
  isAuthenticated: boolean;
  hasWebDAV: boolean;
}

const PocketImport: React.FC<PocketImportProps> = ({ onClose, isAuthenticated, hasWebDAV }) => {
  const [articles, setArticles] = useState<PocketArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [extractingCount, setExtractingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): string[][] => {
    const lines = content.split('\n');
    const result: string[][] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  };

  const parsePocketExport = (content: string): PocketArticle[] => {
    try {
      // Try parsing as JSON first (Pocket API export format)
      const data = JSON.parse(content);
      
      if (data.list) {
        // Pocket API format
        return Object.values(data.list).map((item: any) => ({
          id: item.item_id || Math.random().toString(36).substr(2, 9),
          title: item.resolved_title || item.given_title || 'Untitled',
          url: item.resolved_url || item.given_url,
          excerpt: item.excerpt || '',
          tags: item.tags ? Object.keys(item.tags) : [],
          dateAdded: item.time_added ? new Date(parseInt(item.time_added) * 1000).toISOString() : undefined,
          wordCount: item.word_count ? parseInt(item.word_count) : undefined,
          status: 'pending' as const,
          originalStatus: item.status === '1' ? 'archive' : 'unread'
        }));
      } else if (Array.isArray(data)) {
        // Simple JSON array format
        return data.map((item: any, index: number) => ({
          id: item.id || index.toString(),
          title: item.title || 'Untitled',
          url: item.url,
          excerpt: item.excerpt || item.description || '',
          tags: item.tags || [],
          dateAdded: item.dateAdded || item.date_added,
          wordCount: item.wordCount || item.word_count,
          status: 'pending' as const,
          originalStatus: item.status
        }));
      }
    } catch (jsonError) {
      // Try parsing as CSV (Pocket CSV export)
      try {
        const rows = parseCSV(content);
        
        if (rows.length === 0) {
          throw new Error('Empty CSV file');
        }
        
        // Check if first row looks like headers
        const headers = rows[0].map(h => h.toLowerCase());
        const hasHeaders = headers.includes('title') && headers.includes('url');
        
        const dataRows = hasHeaders ? rows.slice(1) : rows;
        
        if (hasHeaders) {
          // CSV with headers - map columns properly
          const titleIndex = headers.indexOf('title');
          const urlIndex = headers.indexOf('url');
          const timeIndex = headers.findIndex(h => h.includes('time') || h.includes('date'));
          const tagsIndex = headers.indexOf('tags');
          const statusIndex = headers.indexOf('status');
          
          return dataRows
            .filter(row => row[urlIndex] && row[urlIndex].startsWith('http'))
            .map((row, index) => ({
              id: index.toString(),
              title: row[titleIndex] || 'Untitled',
              url: row[urlIndex],
              excerpt: '',
              tags: row[tagsIndex] ? row[tagsIndex].split('|').filter(t => t.trim()) : [],
              dateAdded: row[timeIndex] ? new Date(parseInt(row[timeIndex]) * 1000).toISOString() : undefined,
              status: 'pending' as const,
              originalStatus: row[statusIndex] || 'unread'
            }));
        } else {
          // CSV without headers - assume title, url format
          return dataRows
            .filter(row => row[1] && row[1].startsWith('http'))
            .map((row, index) => ({
              id: index.toString(),
              title: row[0] || 'Untitled',
              url: row[1],
              excerpt: '',
              tags: [],
              status: 'pending' as const
            }));
        }
      } catch (csvError) {
        // Try parsing as HTML (Pocket HTML export)
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const links = doc.querySelectorAll('a[href]');
        
        if (links.length > 0) {
          return Array.from(links).map((link, index) => ({
            id: index.toString(),
            title: link.textContent?.trim() || 'Untitled',
            url: link.getAttribute('href') || '',
            excerpt: link.getAttribute('title') || '',
            tags: [],
            status: 'pending' as const
          })).filter(article => article.url.startsWith('http'));
        }
      }
    }
    
    throw new Error('Unable to parse Pocket export file. Supported formats: JSON (API export), CSV, or HTML export.');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const content = await file.text();
      const parsedArticles = parsePocketExport(content);
      
      if (parsedArticles.length === 0) {
        throw new Error('No articles found in the export file');
      }

      setArticles(parsedArticles);
      setSuccess(`Successfully parsed ${parsedArticles.length} articles from Pocket export!`);
      
      // Show breakdown by original status if available
      const statusCounts = parsedArticles.reduce((acc, article) => {
        const status = article.originalStatus || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      if (Object.keys(statusCounts).length > 1) {
        const breakdown = Object.entries(statusCounts)
          .map(([status, count]) => `${count} ${status}`)
          .join(', ');
        setSuccess(prev => `${prev} Breakdown: ${breakdown}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Pocket export file');
    } finally {
      setLoading(false);
    }
  };

  const extractArticle = async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    // Update article status to extracting
    setArticles(prev => prev.map(a => 
      a.id === articleId ? { ...a, status: 'extracting' } : a
    ));
    setExtractingCount(prev => prev + 1);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          url: article.url, 
          tags: article.tags || [] 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract content');
      }

      // Update article status to extracted
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, status: 'extracted' } : a
      ));
    } catch (error) {
      // Update article status to failed
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { 
          ...a, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Extraction failed' 
        } : a
      ));
    } finally {
      setExtractingCount(prev => prev - 1);
    }
  };

  const extractAllPending = async () => {
    const pendingArticles = filteredArticles.filter(a => a.status === 'pending');
    
    // Extract articles one by one to avoid overwhelming the server
    for (const article of pendingArticles) {
      await extractArticle(article.id);
      // Small delay between extractions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(filter.toLowerCase()) ||
                         article.url.toLowerCase().includes(filter.toLowerCase()) ||
                         (article.tags && article.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' || 
                         article.originalStatus === statusFilter ||
                         (statusFilter === 'unknown' && !article.originalStatus);
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: articles.length,
    pending: filteredArticles.filter(a => a.status === 'pending').length,
    extracted: articles.filter(a => a.status === 'extracted').length,
    failed: articles.filter(a => a.status === 'failed').length,
    extracting: extractingCount
  };

  const originalStatuses = [...new Set(articles.map(a => a.originalStatus).filter(Boolean))];

  return (
    <div className="space-y-6">
      <BrutalCard title="POCKET IMPORT" titleBg="bg-purple-600">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-400 border-4 border-black flex items-center justify-center mx-auto mb-4 transform rotate-12 hover:rotate-0 transition-transform duration-300">
            <Upload className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-black text-black mb-2 uppercase">IMPORT POCKET ARTICLES</h3>
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Upload your Pocket export file
          </p>
        </div>

        {!isAuthenticated && (
          <AlertMessage
            type="error"
            title="AUTHENTICATION REQUIRED"
            message="You must be logged in to import Pocket articles"
          />
        )}

        {isAuthenticated && !hasWebDAV && (
          <AlertMessage
            type="error"
            title="WEBDAV REQUIRED"
            message="Configure WebDAV storage to save imported articles"
          />
        )}

        {isAuthenticated && hasWebDAV && (
          <>
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.html,.htm,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <BrutalButton
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full"
                variant="primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PARSING...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    SELECT POCKET EXPORT FILE
                  </>
                )}
              </BrutalButton>
              <p className="text-xs font-bold text-gray-600 mt-2 text-center uppercase">
                Supports JSON, CSV, and HTML export formats
              </p>
            </div>

            {error && (
              <AlertMessage type="error" message={error} />
            )}

            {success && (
              <AlertMessage type="success" message={success} />
            )}
          </>
        )}

        <div className="flex justify-between">
          <BrutalButton
            onClick={onClose}
            variant="secondary"
          >
            CLOSE
          </BrutalButton>
        </div>
      </BrutalCard>

      {articles.length > 0 && (
        <>
          {/* Stats Card */}
          <BrutalCard title="EXTRACTION STATS" titleBg="bg-blue-600">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-black">{articles.length}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">TOTAL</div>
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">{stats.extracted}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">EXTRACTED</div>
              </div>
              <div>
                <div className="text-2xl font-black text-yellow-600">{stats.pending}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">PENDING</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-600">{stats.failed}</div>
                <div className="text-xs font-bold text-gray-600 uppercase">FAILED</div>
              </div>
            </div>

            {stats.extracting > 0 && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-bold text-blue-600 uppercase">
                    EXTRACTING {stats.extracting} ARTICLES...
                  </span>
                </div>
              </div>
            )}

            {stats.pending > 0 && (
              <div className="mt-4">
                <BrutalButton
                  onClick={extractAllPending}
                  disabled={extractingCount > 0}
                  className="w-full"
                  variant="success"
                >
                  <Download className="w-5 h-5" />
                  EXTRACT ALL PENDING ({stats.pending})
                </BrutalButton>
              </div>
            )}
          </BrutalCard>

          {/* Filters */}
          <BrutalCard>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                  FILTER ARTICLES
                </label>
                <BrutalInput
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by title, URL, or tags..."
                />
              </div>

              {originalStatuses.length > 0 && (
                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">
                    FILTER BY STATUS
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="brutal-input"
                  >
                    <option value="all">ALL ARTICLES</option>
                    {originalStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.toUpperCase()}
                      </option>
                    ))}
                    <option value="unknown">UNKNOWN STATUS</option>
                  </select>
                </div>
              )}
            </div>
          </BrutalCard>

          {/* Articles List */}
          <div className="space-y-3">
            {filteredArticles.map((article) => (
              <BrutalCard key={article.id} hover>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-black text-black text-sm leading-tight break-words flex-1">
                        {article.title}
                      </h4>
                      {article.originalStatus && (
                        <span className={`inline-block px-2 py-1 text-xs font-bold uppercase border-2 flex-shrink-0 ${
                          article.originalStatus === 'archive' 
                            ? 'bg-green-100 text-green-800 border-green-500'
                            : article.originalStatus === 'unread'
                            ? 'bg-blue-100 text-blue-800 border-blue-500'
                            : 'bg-gray-100 text-gray-800 border-gray-500'
                        }`}>
                          {article.originalStatus}
                        </span>
                      )}
                    </div>
                    
                    {article.excerpt && (
                      <p className="text-xs font-bold text-gray-600 mb-2 leading-relaxed">
                        {article.excerpt.substring(0, 150)}
                        {article.excerpt.length > 150 && '...'}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                      <span className="text-xs font-bold text-gray-500 break-all">
                        {new URL(article.url).hostname}
                      </span>
                    </div>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {article.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-gray-200 text-black text-xs font-bold uppercase border-2 border-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-xs font-bold text-gray-500">
                            +{article.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {article.dateAdded && (
                      <div className="text-xs font-bold text-gray-500">
                        Added: {new Date(article.dateAdded).toLocaleDateString()}
                      </div>
                    )}

                    {article.error && (
                      <div className="mt-2">
                        <AlertMessage type="error" message={article.error} />
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {article.status === 'pending' && (
                      <BrutalButton
                        onClick={() => extractArticle(article.id)}
                        size="sm"
                        variant="primary"
                      >
                        <Download className="w-4 h-4" />
                        EXTRACT
                      </BrutalButton>
                    )}

                    {article.status === 'extracting' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border-2 border-yellow-500">
                        <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                        <span className="text-xs font-bold text-yellow-700 uppercase">
                          EXTRACTING
                        </span>
                      </div>
                    )}

                    {article.status === 'extracted' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border-2 border-green-500">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-bold text-green-700 uppercase">
                          EXTRACTED
                        </span>
                      </div>
                    )}

                    {article.status === 'failed' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border-2 border-red-500">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-bold text-red-700 uppercase">
                            FAILED
                          </span>
                        </div>
                        <BrutalButton
                          onClick={() => extractArticle(article.id)}
                          size="sm"
                          variant="danger"
                        >
                          RETRY
                        </BrutalButton>
                      </div>
                    )}
                  </div>
                </div>
              </BrutalCard>
            ))}
          </div>

          {filteredArticles.length === 0 && (filter || statusFilter !== 'all') && (
            <BrutalCard>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-black text-gray-600 uppercase">NO ARTICLES FOUND</p>
                <p className="text-sm font-bold text-gray-500 uppercase">
                  Try adjusting your filters
                </p>
              </div>
            </BrutalCard>
          )}
        </>
      )}
    </div>
  );
};

export default PocketImport;