import { makeAutoObservable, runInAction } from 'mobx';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { RootStore } from './RootStore';

interface Settings {
  backendUrl: string;
  theme: 'brutal' | 'dark' | 'light';
}

const defaultSettings: Settings = {
  backendUrl: Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001',
  theme: 'brutal'
};

// Storage helpers for web compatibility
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
};

export class SettingsStore {
  rootStore: RootStore;
  
  settings: Settings = defaultSettings;
  isLoading = true;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const savedSettings = await storage.getItem('web-ripper-settings');
      runInAction(() => {
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          this.settings = { ...defaultSettings, ...parsed };
        }
        this.isLoading = false;
      });
    } catch (error) {
      this.rootStore.logStore.error('Failed to load settings:', error);
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async updateSettings(newSettings: Partial<Settings>) {
    try {
      const updatedSettings = { ...this.settings, ...newSettings };
      
      runInAction(() => {
        this.settings = updatedSettings;
      });
      
      await storage.setItem('web-ripper-settings', JSON.stringify(updatedSettings));
      this.rootStore.logStore.info('📱 Settings updated:', updatedSettings);
    } catch (error) {
      this.rootStore.logStore.error('Failed to save settings:', error);
      throw error;
    }
  }

  async testConnection(backendUrl?: string) {
    const urlToTest = backendUrl || this.settings.backendUrl;
    
    if (!urlToTest) {
      throw new Error('Backend URL is required');
    }

    try {
      // First test the root endpoint
      this.rootStore.logStore.info('🔍 Testing root endpoint...');
      const rootResponse = await fetch(urlToTest.trim());
      const rootData = await rootResponse.json();
      this.rootStore.logStore.info('✅ Root endpoint response:', rootData);
      
      // Then test the health endpoint
      this.rootStore.logStore.info('🔍 Testing health endpoint...');
      const response = await fetch(`${urlToTest.trim()}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        this.rootStore.logStore.info('✅ Connection test successful:', data);
        return {
          success: true,
          message: `✅ Server: ${data.status}\n🔗 API: ${rootData.name || 'Web Ripper API'}\n📅 Version: ${data.version}`
        };
      } else {
        this.rootStore.logStore.error('❌ Server returned error:', response.status, data);
        throw new Error('Server returned error');
      }
    } catch (err: any) {
      this.rootStore.logStore.error('❌ Connection test failed:', err);
      throw new Error(
        `❌ Could not connect to backend server.\n\nError: ${err.message}\n\nMake sure:\n• Server is running on port 3001\n• URL is correct for your platform\n• No firewall blocking connection`
      );
    }
  }
}