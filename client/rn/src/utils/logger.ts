import { Platform } from 'react-native';

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Log store for mobile
class LogStore {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 1000; // Keep last 1000 logs

  addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      data
    };

    this.logs.unshift(entry); // Add to beginning
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
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
}

// Global log store instance
const logStore = new LogStore();

// Custom logger that works on both platforms
export const logger = {
  log: (message: string, ...args: any[]) => {
    if (Platform.OS === 'web') {
      console.log(message, ...args);
    } else {
      logStore.addLog('log', message, args.length > 0 ? args : undefined);
      console.log(message, ...args); // Still log to native console for debugging
    }
  },

  info: (message: string, ...args: any[]) => {
    if (Platform.OS === 'web') {
      console.info(message, ...args);
    } else {
      logStore.addLog('info', message, args.length > 0 ? args : undefined);
      console.info(message, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (Platform.OS === 'web') {
      console.warn(message, ...args);
    } else {
      logStore.addLog('warn', message, args.length > 0 ? args : undefined);
      console.warn(message, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    if (Platform.OS === 'web') {
      console.error(message, ...args);
    } else {
      logStore.addLog('error', message, args.length > 0 ? args : undefined);
      console.error(message, ...args);
    }
  },

  // Mobile-specific methods
  getLogs: () => logStore.getLogs(),
  clearLogs: () => logStore.clearLogs(),
  subscribe: (listener: (logs: LogEntry[]) => void) => logStore.subscribe(listener),
  exportLogs: () => logStore.exportLogs()
};

// Replace global console for mobile (optional - can be enabled/disabled)
export const interceptConsole = (enable: boolean = true) => {
  if (Platform.OS === 'web' || !enable) return;

  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  if (enable) {
    console.log = (message: any, ...args: any[]) => {
      logger.log(String(message), ...args);
    };
    console.info = (message: any, ...args: any[]) => {
      logger.info(String(message), ...args);
    };
    console.warn = (message: any, ...args: any[]) => {
      logger.warn(String(message), ...args);
    };
    console.error = (message: any, ...args: any[]) => {
      logger.error(String(message), ...args);
    };
  } else {
    // Restore original console
    Object.assign(console, originalConsole);
  }
};