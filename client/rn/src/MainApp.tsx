import React, { useState, useEffect } from 'react';
import { View, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
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

    // Listen for URL events
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription?.remove();
    };
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
        <LogDrawer 
          visible={store.showLogDrawer} 
          onClose={() => store.setShowLogDrawer(false)} 
        />
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