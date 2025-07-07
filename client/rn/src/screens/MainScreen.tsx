import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import BrutalCard from '../components/BrutalCard';
import BrutalButton from '../components/BrutalButton';
import BrutalInput from '../components/BrutalInput';
import AlertMessage from '../components/AlertMessage';
import { styles, colors } from '../styles/globalStyles';

interface MainScreenProps {
  onShowSettings: () => void;
  onShowAuth: () => void;
  initialUrl?: string;
  onUrlProcessed?: () => void;
}

interface ExtractResult {
  success: boolean;
  title: string;
  description: string;
  filename: string;
  content: string;
  wordCount: number;
  imageCount?: number;
  url: string;
  tags?: string[];
  format?: string;
  webdav?: {
    uploaded: boolean;
    path: string;
    url: string;
    metadataPath?: string;
  };
}

export default function MainScreen({ 
  onShowSettings, 
  onShowAuth, 
  initialUrl = '',
  onUrlProcessed 
}: MainScreenProps) {
  const { settings } = useSettings();
  const { user, isAuthenticated, checkAuth } = useAuth();
  
  const [url, setUrl] = useState(initialUrl);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      onUrlProcessed?.();
    }
  }, [initialUrl]);

  useEffect(() => {
    if (isAuthenticated && settings.backendUrl) {
      checkAuth(settings.backendUrl);
    }
  }, [settings.backendUrl, isAuthenticated]);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent.startsWith('http')) {
        setUrl(clipboardContent);
      } else {
        Alert.alert('No URL Found', 'Clipboard does not contain a valid URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read from clipboard');
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!settings.backendUrl) {
      Alert.alert('Backend URL Required', 'Please configure backend URL in settings');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    console.log('🎯 Starting content extraction from:', url.trim());
    console.log('📡 Using backend:', settings.backendUrl);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add auth header if authenticated
      if (isAuthenticated && user) {
        // Note: In real app, you'd get token from secure storage
        // For now, we'll handle this in the auth context
        console.log('🔐 Making authenticated request for user:', user.username);
      }

      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      console.log(`📡 Making request to: ${settings.backendUrl}/api/extract`);
      const response = await fetch(`${settings.backendUrl}/api/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: url.trim(), tags: tagsArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Extraction failed:', response.status, data);
        throw new Error(data.error || 'Failed to extract content');
      }

      console.log('✅ Content extraction successful:', {
        title: data.title,
        wordCount: data.wordCount,
        hasWebDAV: !!data.webdav
      });

      setResult(data);
      setUrl('');
      setTags('');
    } catch (err) {
      console.error('❌ Extraction error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    if (Platform.OS === 'web') {
      // Web download
      const blob = new Blob([result.content], { 
        type: result.format === 'html' ? 'text/html' : 'text/markdown' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Mobile - copy to clipboard for now
      await Clipboard.setStringAsync(result.content);
      Alert.alert('Copied!', 'Content copied to clipboard');
    }
  };

  const handleOpenInBrowser = async () => {
    if (!result) return;
    await WebBrowser.openBrowserAsync(result.url);
  };

  const handleReset = () => {
    setResult(null);
    setError('');
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
          {isAuthenticated ? (
            <Text style={[
              styles.textSm,
              styles.fontBold,
              styles.textRed600,
              styles.uppercase,
              { letterSpacing: 3 }
            ]}>
              @{user?.username}
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
        {!isAuthenticated && (
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
          value={url}
          onChangeText={setUrl}
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

        {isAuthenticated && user?.hasWebDAV && (
          <BrutalInput
            value={tags}
            onChangeText={setTags}
            placeholder="research, ai, tutorial"
            label="TAGS (COMMA SEPARATED)"
            autoCapitalize="none"
          />
        )}

        {error && (
          <AlertMessage type="error" title="MISSION FAILED" message={error} />
        )}

        <BrutalButton
          onPress={handleExtract}
          disabled={loading || !url.trim()}
          loading={loading}
          variant="primary"
          icon={!loading && <Ionicons name="flash" size={20} color={colors.white} />}
        >
          {loading ? 'RIPPING...' : 'DESTROY & EXTRACT'}
        </BrutalButton>
      </View>
    </BrutalCard>
  );

  const renderResult = () => {
    if (!result) return null;

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
            backgroundColor: isAuthenticated && user?.hasWebDAV ? colors.blue600 : colors.yellow400,
            borderWidth: 2,
            borderColor: colors.black,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons 
            name={isAuthenticated && user?.hasWebDAV ? "cloud" : "download"} 
            size={24} 
            color={isAuthenticated && user?.hasWebDAV ? colors.white : colors.black} 
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
            {isAuthenticated && user?.hasWebDAV ? 'CLOUD STORAGE' : 'INSTANT LOOT'}
          </Text>
          <Text style={[
            styles.textXs,
            styles.fontBold,
            styles.textGray700,
            styles.uppercase
          ]}>
            {isAuthenticated && user?.hasWebDAV ? 'UPLOADS TO WEBDAV' : 'DOWNLOAD IN SECONDS'}
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
          {!result ? (
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
}