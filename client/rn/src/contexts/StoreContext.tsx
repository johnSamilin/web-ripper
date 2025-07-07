import React, { createContext, useContext } from 'react';
import { RootStore, rootStore } from '../stores/RootStore';

const StoreContext = createContext<RootStore>(rootStore);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};

// Individual store hooks for convenience
export const useAuthStore = () => useStore().authStore;
export const useSettingsStore = () => useStore().settingsStore;
export const useLogStore = () => useStore().logStore;
export const useExtractionStore = () => useStore().extractionStore;