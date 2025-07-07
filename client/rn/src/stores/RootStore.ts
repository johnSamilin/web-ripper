import { makeAutoObservable } from 'mobx';
import { AuthStore } from './AuthStore';
import { SettingsStore } from './SettingsStore';
import { LogStore } from './LogStore';
import { ExtractionStore } from './ExtractionStore';

export class RootStore {
  authStore: AuthStore;
  settingsStore: SettingsStore;
  logStore: LogStore;
  extractionStore: ExtractionStore;

  constructor() {
    makeAutoObservable(this);
    
    this.authStore = new AuthStore(this);
    this.settingsStore = new SettingsStore(this);
    this.logStore = new LogStore(this);
    this.extractionStore = new ExtractionStore(this);
  }

  // Global app state
  currentScreen: 'main' | 'settings' | 'auth' = 'main';
  showLogDrawer = false;
  sharedUrl = '';

  setCurrentScreen(screen: 'main' | 'settings' | 'auth') {
    this.currentScreen = screen;
  }

  setShowLogDrawer(show: boolean) {
    this.showLogDrawer = show;
  }

  setSharedUrl(url: string) {
    this.sharedUrl = url;
  }

  clearSharedUrl() {
    this.sharedUrl = '';
  }
}

// Create singleton instance
export const rootStore = new RootStore();