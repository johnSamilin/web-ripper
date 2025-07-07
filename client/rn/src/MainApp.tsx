import React, { useState, useEffect } from 'react';
import { View, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { logger, interceptConsole } from './utils/logger';
import LogDrawer from './components/LogDrawer';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import AuthScreen from './screens/AuthScreen';
import { styles } from './styles/globalStyles';

export default function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'settings' | 'auth'>('main');
  const [sharedUrl, setSharedUrl] = useState<string>('');
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  useEffect(() => {
    // Enable console interception for mobile
    if (Platform.OS !== 'web') {
      interceptConsole(true);
      logger.info('🚀 Web Ripper mobile app started');
      logger.info(`📱 Platform: ${Platform.OS}`);
    }
  }, []);

  useEffect(() => {
    // Handle incoming URLs (share target)
    const handleUrl = (url: string) => {
      logger.info('📱 Received URL:', url);
      
      // Extract URL from share intent
      if (url.includes('text=')) {
        const urlMatch = url.match(/text=([^&]+)/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          if (decodedUrl.startsWith('http')) {
            setSharedUrl(decodedUrl);
            setCurrentScreen('main');
          }
        }
      } else if (url.startsWith('http')) {
        setSharedUrl(url);
        setCurrentScreen('main');
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
    switch (currentScreen) {
      case 'settings':
        return <SettingsScreen onBack={() => setCurrentScreen('main')} />;
      case 'auth':
        return <AuthScreen onBack={() => setCurrentScreen('main')} />;
      default:
        return (
          <MainScreen
            onShowSettings={() => setCurrentScreen('settings')}
            onShowAuth={() => setCurrentScreen('auth')}
            onShowLogs={() => setShowLogDrawer(true)}
            initialUrl={sharedUrl}
            onUrlProcessed={() => setSharedUrl('')}
          />
        );
    }
  };

  return (
    <SettingsProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.container}>
            {renderScreen()}
            <LogDrawer 
              visible={showLogDrawer} 
              onClose={() => setShowLogDrawer(false)} 
            />
          </View>
        </SafeAreaView>
      </AuthProvider>
    </SettingsProvider>
  );
}