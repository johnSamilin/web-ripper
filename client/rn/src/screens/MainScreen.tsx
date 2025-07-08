import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';

import { useAuthStore, useSettingsStore, useExtractionStore } from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import BrutalCard from '../components/BrutalCard';
import BrutalButton from '../components/BrutalButton';
import BrutalInput from '../components/BrutalInput';
import AlertMessage from '../components/AlertMessage';
import { styles, colors } from '../styles/globalStyles';

interface MainScreenProps {
  onShowSettings: () => void;
  onShowAuth: () => void;
  onShowLogs: () => void;
  initialUrl?: string;
  onUrlProcessed?: () => void;
}

const MainScreen = observer(({ 
  onShowSettings, 
  onShowAuth, 
  onShowLogs,
  initialUrl = '',
  onUrlProcessed 
}: MainScreenProps) => {
  const authStore = useAuthStore();
  const settingsStore = useSettingsStore();
  const extractionStore = useExtractionStore();

  useEffect(() => {
    if (initialUrl) {
      extractionStore.setUrl(initialUrl);
      onUrlProcessed?.();
    }
  }, [initialUrl]);

  useEffect(() => {
    if (authStore.isAuthenticated && settingsStore.settings.backendUrl) {
      authStore.checkAuth(settingsStore.settings.backendUrl);
    }
  }, [settingsStore.settings.backendUrl, authStore.isAuthenticated]);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent.startsWith('http')) {
        extractionStore.setUrl(clipboardContent);
      } else {
        Alert.alert('No URL Found', 'Clipboard does not contain a valid URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read from clipboard');
    }
  };

  const handleExtract = async () => {
    await extractionStore.extractContent();
  };

  const handleDownload = async () => {
    if (!extractionStore.result) return;

    if (Platform.OS === 'web') {
      // Web download
      const blob = new Blob([extractionStore.result.content], { 
        type: extractionStore.result.format === 'html' ? 'text/html' : 'text/markdown' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = extractionStore.result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Mobile - copy to clipboard for now
      await Clipboard.setStringAsync(extractionStore.result.content);
      Alert.alert('Copied!', 'Content copied to clipboard');
    }
  };

  const handleOpenInBrowser = async () => {
    if (!extractionStore.result) return;
    await WebBrowser.openBrowserAsync(extractionStore.result.url);
  };

  const handleReset = () => {
    extractionStore.reset();
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.spaceBetween, styles.alignCenter, styles.p4]}>
      <View style={[styles.row, styles.alignCenter, { gap: 16 }]}>
        <View style={[
          {
            width: 48,
            height: 48,
            backgroundColor: colors.black,
            borderWidth: 4,
            borderColor: colors.red500,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons name="skull" size={24} color={colors.red500} />
        </View>
        <View>
          <Text style={[
            styles.text2xl,
            styles.fontBlack,
            styles.textBlack,
            styles.uppercase,
            { letterSpacing: 2, transform: [{ skewX: '-5deg' }] }
          ]}>
            WEB RIPPER
          </Text>
          {authStore.isAuthenticated ? (
            <Text style={[
              styles.textSm,
              styles.fontBold,
              styles.textRed600,
              styles.uppercase,
              { letterSpacing: 3 }
            ]}>
              @{authStore.user?.username}
            </Text>
          ) : (
            <Text style={[
              styles.textSm,
              styles.fontBold,
              styles.textGray600,
              styles.uppercase,
              { letterSpacing: 3 }
            ]}>
              ANONYMOUS MODE
            </Text>
          )}
        </View>
      </View>
      
      <View style={[styles.row, { gap: 8 }]}>
        <BrutalButton
          onPress={onShowSettings}
          variant="secondary"
          size="sm"
          icon={<Ionicons name="settings" size={20} color={colors.black} />}
        >
          SETTINGS
        </BrutalButton>
        <BrutalButton
          onPress={onShowLogs}
          variant="secondary"
          size="sm"
          icon={<Ionicons name="terminal" size={20} color={colors.black} />}
        >
          LOGS
        </BrutalButton>
        {!authStore.isAuthenticated && (
          <BrutalButton
            onPress={onShowAuth}
            variant="primary"
            size="sm"
            icon={<Ionicons name="person-add" size={20} color={colors.white} />}
          >
            LOGIN
          </BrutalButton>
        )}
      </View>
    </View>
  );

  const renderExtractionForm = () => (
    <BrutalCard title="TARGET ACQUIRED" titleBg={colors.red500}>
      <View style={[styles.center, styles.mb4]}>
        <View style={[
          {
            width: 64,
            height: 64,
            backgroundColor: colors.yellow400,
            borderWidth: 4,
            borderColor: colors.black,
            transform: [{ rotate: '12deg' }],
            marginBottom: 16,
          },
          styles.center
        ]}>
          <Ionicons name="locate" size={32} color={colors.black} />
        </View>
        <Text style={[
          styles.textLg,
          styles.fontBlack,
          styles.textBlack,
          styles.uppercase,
          styles.mb4
        ]}>
          LOCK & LOAD
        </Text>
        <Text style={[
          styles.textSm,
          styles.fontBold,
          styles.textGray700,
          styles.uppercase,
          styles.textCenter,
          { letterSpacing: 1 }
        ]}>
          ENTER TARGET URL
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <BrutalInput
          value={extractionStore.url}
          onChangeText={extractionStore.setUrl}
          placeholder="https://victim-site.com/article"
          label="VICTIM URL"
          keyboardType="url"
          autoCapitalize="none"
          icon={<Ionicons name="radio-button-on" size={20} color={colors.red600} />}
        />

        <View style={[styles.row, { gap: 8 }]}>
          <BrutalButton
            onPress={handlePasteFromClipboard}
            variant="secondary"
            size="sm"
            style={{ flex: 1 }}
            icon={<Ionicons name="clipboard" size={16} color={colors.black} />}
          >
            PASTE
          </BrutalButton>
        </View>

        {authStore.isAuthenticated && authStore.user?.hasWebDAV && (
          <BrutalInput
            value={extractionStore.tags}
            onChangeText={extractionStore.setTags}
            placeholder="research, ai, tutorial"
            label="TAGS (COMMA SEPARATED)"
            autoCapitalize="none"
          />
        )}

        {extractionStore.error && (
          <AlertMessage type="error" title="MISSION FAILED" message={extractionStore.error} />
        )}

        <BrutalButton
          onPress={handleExtract}
          disabled={extractionStore.loading || !extractionStore.url.trim()}
          loading={extractionStore.loading}
          variant="primary"
          icon={!extractionStore.loading && <Ionicons name="flash" size={20} color={colors.white} />}
        >
          {extractionStore.loading ? 'RIPPING...' : 'DESTROY & EXTRACT'}
        </BrutalButton>
      </View>
    </BrutalCard>
  );

  const renderResult = () => {
    if (!extractionStore.result) return null;
    
    const result = extractionStore.result;

    return (
      <BrutalCard title="MISSION COMPLETE" titleBg={colors.green500}>
        <View style={[styles.center, styles.mb4]}>
          <View style={[
            {
              width: 64,
              height: 64,
              backgroundColor: colors.green400,
              borderWidth: 4,
              borderColor: colors.black,
              transform: [{ rotate: '12deg' }],
              marginBottom: 16,
            },
            styles.center
          ]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.black} />
          </View>
          <Text style={[
            styles.textLg,
            styles.fontBlack,
            styles.textBlack,
            styles.uppercase,
            styles.mb4
          ]}>
            TARGET ELIMINATED
          </Text>
          <Text style={[
            styles.textSm,
            styles.fontBold,
            styles.textGray700,
            styles.uppercase,
            styles.textCenter,
            { letterSpacing: 1 }
          ]}>
            {result.format === 'html' ? 'HTML GENERATED' : 'CONTENT EXTRACTED'}
          </Text>
        </View>

        <View style={[
          {
            backgroundColor: colors.gray100,
            borderWidth: 4,
            borderColor: colors.black,
            padding: 16,
            marginBottom: 16,
          }
        ]}>
          <Text style={[
            styles.fontBlack,
            styles.textBlack,
            styles.textSm,
            styles.uppercase,
            { marginBottom: 8, lineHeight: 18 }
          ]}>
            {result.title}
          </Text>
          
          {result.description && (
            <Text style={[
              styles.textXs,
              styles.fontBold,
              styles.textGray700,
              { marginBottom: 12, lineHeight: 16 }
            ]}>
              {result.description}
            </Text>
          )}

          {result.tags && result.tags.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.row, styles.alignCenter, { gap: 4, marginBottom: 8 }]}>
                <Ionicons name="pricetag" size={12} color={colors.gray600} />
                <Text style={[
                  styles.textXs,
                  styles.fontBlack,
                  styles.textGray600,
                  styles.uppercase
                ]}>
                  TAGS
                </Text>
              </View>
              <View style={[styles.row, { flexWrap: 'wrap', gap: 4 }]}>
                {result.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: colors.black,
                      borderWidth: 2,
                      borderColor: colors.yellow400,
                    }}
                  >
                    <Text style={[
                      styles.textXs,
                      styles.fontBold,
                      styles.textWhite,
                      styles.uppercase
                    ]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.row, { flexWrap: 'wrap', gap: 16 }]}>
            <View style={[styles.row, styles.alignCenter, { gap: 4 }]}>
              <Ionicons name="globe" size={12} color={colors.gray600} />
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.uppercase]}>
                {new URL(result.url).hostname}
              </Text>
            </View>
            <View style={[styles.row, styles.alignCenter, { gap: 4 }]}>
              <Ionicons name="document-text" size={12} color={colors.gray600} />
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.uppercase]}>
                {result.wordCount.toLocaleString()} WORDS
              </Text>
            </View>
            {result.imageCount !== undefined && (
              <View style={[styles.row, styles.alignCenter, { gap: 4 }]}>
                <Ionicons name="image" size={12} color={colors.gray600} />
                <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.uppercase]}>
                  {result.imageCount} IMAGES
                </Text>
              </View>
            )}
          </View>
        </View>

        {result.webdav && (
          <View style={{ marginBottom: 16 }}>
            <AlertMessage
              type="success"
              title="UPLOADED TO WEBDAV"
              message={result.webdav.path}
            />
          </View>
        )}

        <View style={{ gap: 12 }}>
          <View style={[styles.row, { gap: 8 }]}>
            {!result.webdav && (
              <BrutalButton
                onPress={handleDownload}
                variant="success"
                style={{ flex: 1 }}
                icon={<Ionicons name="download" size={20} color={colors.black} />}
              >
                DOWNLOAD
              </BrutalButton>
            )}
            <BrutalButton
              onPress={handleOpenInBrowser}
              variant="secondary"
              style={{ flex: 1 }}
              icon={<Ionicons name="open" size={20} color={colors.black} />}
            >
              OPEN
            </BrutalButton>
          </View>
          <BrutalButton
            onPress={handleReset}
            variant="warning"
            icon={<Ionicons name="refresh" size={20} color={colors.black} />}
          >
            FIND NEW TARGET
          </BrutalButton>
        </View>
      </BrutalCard>
    );
  };

  const renderInfoSection = () => (
    <View style={{ gap: 12 }}>
      <View style={[
        styles.bgWhite,
        styles.border4,
        styles.p4,
        styles.row,
        styles.alignCenter,
        { gap: 16 }
      ]}>
        <View style={[
          {
            width: 48,
            height: 48,
            backgroundColor: colors.red500,
            borderWidth: 2,
            borderColor: colors.black,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons name="document-text" size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.fontBlack,
            styles.textBlack,
            styles.textSm,
            styles.uppercase,
            { letterSpacing: 1 }
          ]}>
            CLEAN KILL
          </Text>
          <Text style={[
            styles.textXs,
            styles.fontBold,
            styles.textGray700,
            styles.uppercase
          ]}>
            DESTROYS ADS & CLUTTER
          </Text>
        </View>
      </View>

      <View style={[
        styles.bgWhite,
        styles.border4,
        styles.p4,
        styles.row,
        styles.alignCenter,
        { gap: 16 }
      ]}>
        <View style={[
          {
            width: 48,
            height: 48,
            backgroundColor: authStore.isAuthenticated && authStore.user?.hasWebDAV ? colors.blue600 : colors.yellow400,
            borderWidth: 2,
            borderColor: colors.black,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons 
            name={authStore.isAuthenticated && authStore.user?.hasWebDAV ? "cloud" : "download"} 
            size={24} 
            color={authStore.isAuthenticated && authStore.user?.hasWebDAV ? colors.white : colors.black} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.fontBlack,
            styles.textBlack,
            styles.textSm,
            styles.uppercase,
            { letterSpacing: 1 }
          ]}>
            {authStore.isAuthenticated && authStore.user?.hasWebDAV ? 'CLOUD STORAGE' : 'INSTANT LOOT'}
          </Text>
          <Text style={[
            styles.textXs,
            styles.fontBold,
            styles.textGray700,
            styles.uppercase
          ]}>
            {authStore.isAuthenticated && authStore.user?.hasWebDAV ? 'UPLOADS TO WEBDAV' : 'DOWNLOAD IN SECONDS'}
          </Text>
        </View>
      </View>

      <View style={[
        styles.bgWhite,
        styles.border4,
        styles.p4,
        styles.row,
        styles.alignCenter,
        { gap: 16 }
      ]}>
        <View style={[
          {
            width: 48,
            height: 48,
            backgroundColor: colors.blue600,
            borderWidth: 2,
            borderColor: colors.black,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons name="flash" size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.fontBlack,
            styles.textBlack,
            styles.textSm,
            styles.uppercase,
            { letterSpacing: 1 }
          ]}>
            NO MERCY
          </Text>
          <Text style={[
            styles.textXs,
            styles.fontBold,
            styles.textGray700,
            styles.uppercase
          ]}>
            ANY SITE • ANY TARGET
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.flex1} contentContainerStyle={styles.p4}>
        <View style={{ gap: 24 }}>
          {!extractionStore.result ? (
            <>
              {renderExtractionForm()}
              {renderInfoSection()}
            </>
          ) : (
            renderResult()
          )}
        </View>
      </ScrollView>
    </View>
  );
});

export default MainScreen;