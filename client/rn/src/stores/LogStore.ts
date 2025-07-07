import { makeAutoObservable, runInAction } from 'mobx';
import { Platform } from 'react-native';
import { RootStore } from './RootStore';

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export class LogStore {
  rootStore: RootStore;
  
  logs: LogEntry[] = [];
  filter: 'all' | 'log' | 'info' | 'warn' | 'error' = 'all';
  maxLogs = 1000; // Keep last 1000 logs

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  get filteredLogs() {
    return this.logs.filter(log => 
      this.filter === 'all' || log.level === this.filter
    );
  }

  addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      data
    };

    runInAction(() => {
      this.logs.unshift(entry); // Add to beginning
      
      // Keep only last maxLogs entries
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }
    });
  }

  clearLogs() {
    runInAction(() => {
      this.logs = [];
    });
  }

  setFilter(filter: 'all' | 'log' | 'info' | 'warn' | 'error') {
    this.filter = filter;
  }

  exportLogs(): string {
    return this.logs
      .map(log => {
        const timestamp = log.timestamp.toISOString();
        const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
        return `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
      })
      .join('\n');
  }

  // Logger methods
  log(message: string, ...args: any[]) {
    if (Platform.OS === 'web') {
      console.log(message, ...args);
    } else {
      this.addLog('log', message, args.length > 0 ? args : undefined);
      console.log(message, ...args); // Still log to native console for debugging
    }
  }

  info(message: string, ...args: any[]) {
    if (Platform.OS === 'web') {
      console.info(message, ...args);
    } else {
      this.addLog('info', message, args.length > 0 ? args : undefined);
      console.info(message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (Platform.OS === 'web') {
      console.warn(message, ...args);
    } else {
      this.addLog('warn', message, args.length > 0 ? args : undefined);
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (Platform.OS === 'web') {
      console.error(message, ...args);
    } else {
      this.addLog('error', message, args.length > 0 ? args : undefined);
      console.error(message, ...args);
    }
  }
}