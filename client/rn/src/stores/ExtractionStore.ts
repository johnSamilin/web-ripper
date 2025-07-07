import { makeAutoObservable, runInAction } from 'mobx';
import { RootStore } from './RootStore';

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

export class ExtractionStore {
  rootStore: RootStore;
  
  // Form state
  url = '';
  tags = '';
  
  // Extraction state
  loading = false;
  error = '';
  result: ExtractResult | null = null;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  setUrl(url: string) {
    this.url = url;
  }

  setTags(tags: string) {
    this.tags = tags;
  }

  setError(error: string) {
    this.error = error;
  }

  clearError() {
    this.error = '';
  }

  reset() {
    runInAction(() => {
      this.result = null;
      this.error = '';
      this.url = '';
      this.tags = '';
    });
  }

  async extractContent() {
    if (!this.url.trim()) {
      this.setError('URL is required');
      return;
    }

    if (!this.rootStore.settingsStore.settings.backendUrl) {
      this.setError('Backend URL not configured. Please go to settings first.');
      return;
    }

    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(this.url.startsWith('http') ? this.url : `https://${this.url}`);
    } catch (error) {
      this.setError('Invalid URL format');
      return;
    }

    runInAction(() => {
      this.loading = true;
      this.error = '';
      this.result = null;
    });

    this.rootStore.logStore.info('🎯 Starting content extraction from:', this.url.trim());
    this.rootStore.logStore.info('📡 Using backend:', this.rootStore.settingsStore.settings.backendUrl);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add auth header if authenticated
      if (this.rootStore.authStore.isAuthenticated && this.rootStore.authStore.user) {
        this.rootStore.logStore.info('🔐 Making authenticated request for user:', this.rootStore.authStore.user.username);
      }

      const tagsArray = this.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      this.rootStore.logStore.info(`📡 Making request to: ${this.rootStore.settingsStore.settings.backendUrl}/api/extract`);
      
      const response = await fetch(`${this.rootStore.settingsStore.settings.backendUrl}/api/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: this.url.trim(), tags: tagsArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.rootStore.logStore.error('❌ Extraction failed:', response.status, data);
        throw new Error(data.error || 'Failed to extract content');
      }

      this.rootStore.logStore.info('✅ Content extraction successful:', {
        title: data.title,
        wordCount: data.wordCount,
        hasWebDAV: !!data.webdav
      });

      runInAction(() => {
        this.result = data;
        this.url = '';
        this.tags = '';
      });
    } catch (err: any) {
      this.rootStore.logStore.error('❌ Extraction error:', err);
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'An error occurred';
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }
}