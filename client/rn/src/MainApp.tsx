import React, { useState, useEffect } from 'react';
import { View, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from './contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import LogDrawer from './components/LogDrawer';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import AuthScreen from './screens/AuthScreen';
import { styles } from './styles/globalStyles';

const AppContent = observer(() => {
  const store = useStore();

  useEffect(() => {
    // Enable console interception for mobile
    if (Platform.OS !== 'web') {
      store.logStore.info('🚀 Web Ripper mobile app started');
      store.logStore.info(`📱 Platform: ${Platform.OS}`);
    }
  }, []);

  useEffect(() => {
    // Handle incoming URLs (share target)
    if (Platform.OS !== 'web') {
      const handleUrl = (url: string) => {
        store.logStore.info('📱 Received URL:', url);
        
        // Extract URL from share intent
        if (url.includes('text=')) {
          const urlMatch = url.match(/text=([^&]+)/);
          if (urlMatch) {
            const decodedUrl = decodeURIComponent(urlMatch[1]);
            if (decodedUrl.startsWith('http')) {
              store.setSharedUrl(decodedUrl);
              store.setCurrentScreen('main');
            }
          }
        } else if (url.startsWith('http')) {
          store.setSharedUrl(url);
          store.setCurrentScreen('main');
        }
      };

      // Handle Android share intents
      const handleShareIntent = async () => {
        try {
          // Check if app was opened via share intent
          const initialURL = await Linking.getInitialURL();
          if (initialURL) {
            store.logStore.info('📱 App opened with initial URL:', initialURL);
            handleUrl(initialURL);
          }
        } catch (error) {
          store.logStore.error('Failed to get initial URL:', error);
        }
      };

      // Listen for URL events
      const subscription = Linking.addEventListener('url', (event) => {
        handleUrl(event.url);
      });

      // Handle share intent on app start
      handleShareIntent();

      return () => {
        subscription?.remove();
      };
    }
  }, []);

  const renderScreen = () => {
    switch (store.currentScreen) {
      case 'settings':
        return <SettingsScreen onBack={() => store.setCurrentScreen('main')} />;
      case 'auth':
        return <AuthScreen onBack={() => store.setCurrentScreen('main')} />;
      default:
        return (
          <MainScreen
            onShowSettings={() => store.setCurrentScreen('settings')}
            onShowAuth={() => store.setCurrentScreen('auth')}
            onShowLogs={() => store.setShowLogDrawer(true)}
            initialUrl={store.sharedUrl}
            onUrlProcessed={() => store.clearSharedUrl()}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {renderScreen()}
        {Platform.OS !== 'web' && (
          <LogDrawer 
            visible={store.showLogDrawer} 
            onClose={() => store.setShowLogDrawer(false)} 
          />
        )}
      </View>
    </SafeAreaView>
  );
});

export default function MainApp() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}