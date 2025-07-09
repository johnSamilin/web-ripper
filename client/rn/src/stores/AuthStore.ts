import { makeAutoObservable, runInAction } from 'mobx';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { RootStore } from './RootStore';

interface User {
  id: number;
  username: string;
  email: string;
  hasWebDAV: boolean;
}

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
  },
  
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export class AuthStore {
  rootStore: RootStore;
  
  user: User | null = null;
  token: string | null = null;
  isLoading = true;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
    this.loadToken();
  }

  get isAuthenticated() {
    return !!this.user && !!this.token;
  }

  private async loadToken() {
    try {
      const savedToken = await storage.getItem('web-ripper-token');
      runInAction(() => {
        if (savedToken) {
          this.token = savedToken;
        }
        this.isLoading = false;
      });
    } catch (error) {
      this.rootStore.logStore.error('Failed to load token:', error);
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async checkAuth(backendUrl: string) {
    if (!this.token) return;

    this.rootStore.logStore.info('🔐 Checking auth with backend:', backendUrl);

    try {
      const response = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        runInAction(() => {
          this.user = data.user;
        });
        this.rootStore.logStore.info('✅ Auth check successful for user:', data.user.username);
      } else {
        this.rootStore.logStore.warn('⚠️ Auth check failed, logging out');
        await this.logout();
      }
    } catch (error) {
      this.rootStore.logStore.error('Auth check failed:', error);
      // Don't auto-logout on network errors for web version
      if (error.message && !error.message.includes('fetch')) {
        await this.logout();
      }
    }
  }

  async login(username: string, password: string, backendUrl: string) {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    runInAction(() => {
      this.token = data.token;
      this.user = data.user;
    });
    
    await storage.setItem('web-ripper-token', data.token);
  }

  async register(username: string, email: string, password: string, backendUrl: string) {
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    runInAction(() => {
      this.token = data.token;
      this.user = data.user;
    });
    
    await storage.setItem('web-ripper-token', data.token);
  }

  async logout() {
    runInAction(() => {
      this.user = null;
      this.token = null;
    });
    await storage.deleteItem('web-ripper-token');
  }
}