import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore, useSettingsStore } from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import BrutalCard from '../components/BrutalCard';
import BrutalButton from '../components/BrutalButton';
import BrutalInput from '../components/BrutalInput';
import AlertMessage from '../components/AlertMessage';
import { styles, colors } from '../styles/globalStyles';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen = observer(({ onBack }: SettingsScreenProps) => {
  const authStore = useAuthStore();
  const settingsStore = useSettingsStore();
  
  const [backendUrl, setBackendUrl] = useState(settingsStore.settings.backendUrl);
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');
  const [webdavLoading, setWebdavLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [webdavError, setWebdavError] = useState('');
  const [webdavSuccess, setWebdavSuccess] = useState('');

  // Load WebDAV settings when component mounts
  useEffect(() => {
    if (authStore.isAuthenticated) {
      loadWebDAVSettings();
    }
  }, [authStore.isAuthenticated]);

  const loadWebDAVSettings = async () => {
    try {
      const response = await fetch(`${settingsStore.settings.backendUrl}/api/settings/webdav`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWebdavUrl(data.webdav.url || '');
        setWebdavUsername(data.webdav.username || '');
        // Don't load password for security
      }
    } catch (error) {
      console.error('Failed to load WebDAV settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!backendUrl.trim()) {
      setError('Backend URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(backendUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await settingsStore.updateSettings({ backendUrl: backendUrl.trim() });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!backendUrl.trim()) {
      setError('Backend URL is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await settingsStore.testConnection(backendUrl.trim());
      Alert.alert('Connection Successful', result.message);
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebDAV = async () => {
    if (!authStore.isAuthenticated) return;

    setWebdavLoading(true);
    setWebdavError('');
    setWebdavSuccess('');

    try {
      const response = await fetch(`${settingsStore.settings.backendUrl}/api/settings/webdav`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          url: webdavUrl.trim(),
          username: webdavUsername.trim(),
          password: webdavPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setWebdavSuccess('WebDAV settings saved successfully!');
        // Update user's hasWebDAV status
        if (authStore.user) {
          authStore.user.hasWebDAV = data.webdav.isConfigured;
        }
        setTimeout(() => setWebdavSuccess(''), 3000);
      } else {
        setWebdavError(data.error || 'Failed to save WebDAV settings');
      }
    } catch (err) {
      setWebdavError('Failed to save WebDAV settings');
    } finally {
      setWebdavLoading(false);
    }
  };

  const handleTestWebDAV = async () => {
    if (!authStore.isAuthenticated) return;

    if (!webdavUrl.trim() || !webdavUsername.trim() || !webdavPassword.trim()) {
      setWebdavError('URL, username, and password are required for testing');
      return;
    }

    setWebdavLoading(true);
    setWebdavError('');
    setWebdavSuccess('');

    try {
      const response = await fetch(`${settingsStore.settings.backendUrl}/api/settings/webdav/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          url: webdavUrl.trim(),
          username: webdavUsername.trim(),
          password: webdavPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Connection Successful', data.message);
      } else {
        Alert.alert('Connection Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not connect to WebDAV server');
    } finally {
      setWebdavLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await authStore.logout();
            onBack();
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.p4]}>
      <View style={[styles.row, styles.spaceBetween, styles.alignCenter]}>
        <Text style={[
          styles.textXl,
          styles.fontBlack,
          styles.textBlack,
          styles.uppercase,
          { letterSpacing: 2 }
        ]}>
          SETTINGS
        </Text>
      
        <BrutalButton
          onPress={onBack}
          variant="secondary"
          size="sm"
          icon={<Ionicons name="arrow-back" size={18} color={colors.black} />}
        >
          BACK
        </BrutalButton>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.flex1} contentContainerStyle={styles.p4}>
        <View style={{ gap: 24 }}>
          {/* Backend Configuration */}
          <BrutalCard title="BACKEND CONFIGURATION" titleBg={colors.blue600}>
            <View style={{ gap: 16 }}>
              <BrutalInput
                value={backendUrl}
                onChangeText={setBackendUrl}
                placeholder="http://10.0.2.2:3001"
                label="BACKEND URL"
                keyboardType="url"
                autoCapitalize="none"
                icon={<Ionicons name="server" size={20} color={colors.blue600} />}
              />

              {error && (
                <AlertMessage type="error" message={error} />
              )}

              {success && (
                <AlertMessage type="success" message={success} />
              )}

              <View style={[styles.row, { gap: 8 }]}>
                <BrutalButton
                  onPress={handleTestConnection}
                  disabled={loading}
                  variant="secondary"
                  style={{ flex: 1 }}
                  icon={<Ionicons name="wifi" size={20} color={colors.black} />}
                >
                  TEST
                </BrutalButton>
                <BrutalButton
                  onPress={handleSaveSettings}
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  style={{ flex: 1 }}
                  icon={!loading && <Ionicons name="save" size={20} color={colors.white} />}
                >
                  SAVE
                </BrutalButton>
              </View>
            </View>
          </BrutalCard>

          {/* Account Information */}
          {authStore.isAuthenticated && (
            <BrutalCard title="ACCOUNT" titleBg={colors.green500}>
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={[
                    styles.textSm,
                    styles.fontBlack,
                    styles.textBlack,
                    styles.uppercase,
                    { letterSpacing: 2, marginBottom: 8 }
                  ]}>
                    USERNAME
                  </Text>
                  <View style={[
                    styles.brutalInput,
                    { backgroundColor: colors.gray200 }
                  ]}>
                    <Text style={[
                      styles.textBase,
                      styles.fontBold,
                      styles.textGray700
                    ]}>
                      {authStore.user.username}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text style={[
                    styles.textSm,
                    styles.fontBlack,
                    styles.textBlack,
                    styles.uppercase,
                    { letterSpacing: 2, marginBottom: 8 }
                  ]}>
                    EMAIL
                  </Text>
                  <View style={[
                    styles.brutalInput,
                    { backgroundColor: colors.gray200 }
                  ]}>
                    <Text style={[
                      styles.textBase,
                      styles.fontBold,
                      styles.textGray700
                    ]}>
                      {authStore.user.email}
                    </Text>
                  </View>
                </View>

                <View style={[styles.row, styles.alignCenter, { gap: 8 }]}>
                  <View style={[
                    {
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: authStore.user.hasWebDAV ? colors.green500 : colors.red500,
                    }
                  ]} />
                  <Text style={[
                    styles.textSm,
                    styles.fontBold,
                    styles.textGray700,
                    styles.uppercase
                  ]}>
                    WebDAV: {authStore.user.hasWebDAV ? 'CONFIGURED' : 'NOT CONFIGURED'}
                  </Text>
                </View>

                <BrutalButton
                  onPress={handleLogout}
                  variant="danger"
                  icon={<Ionicons name="log-out" size={20} color={colors.white} />}
                >
                  LOGOUT
                </BrutalButton>
              </View>
            </BrutalCard>
          )}

          {/* WebDAV Settings */}
          {authStore.isAuthenticated && (
            <BrutalCard title="WEBDAV STORAGE" titleBg={colors.blue600}>
              <View style={{ gap: 16 }}>
                <Text style={[
                  styles.textSm,
                  styles.fontBold,
                  styles.textGray700,
                  { marginBottom: 8 }
                ]}>
                  Configure cloud storage for automatic article uploads
                </Text>

                <BrutalInput
                  value={webdavUrl}
                  onChangeText={setWebdavUrl}
                  placeholder="https://webdav.example.com/"
                  label="WEBDAV URL"
                  keyboardType="url"
                  autoCapitalize="none"
                  icon={<Ionicons name="cloud" size={20} color={colors.blue600} />}
                />

                <BrutalInput
                  value={webdavUsername}
                  onChangeText={setWebdavUsername}
                  placeholder="username"
                  label="USERNAME"
                  autoCapitalize="none"
                  icon={<Ionicons name="person" size={20} color={colors.blue600} />}
                />

                <BrutalInput
                  value={webdavPassword}
                  onChangeText={setWebdavPassword}
                  placeholder="••••••••"
                  label="PASSWORD"
                  secureTextEntry
                  autoCapitalize="none"
                  icon={<Ionicons name="lock-closed" size={20} color={colors.blue600} />}
                />

                {webdavError && (
                  <AlertMessage type="error" message={webdavError} />
                )}

                {webdavSuccess && (
                  <AlertMessage type="success" message={webdavSuccess} />
                )}

                <View style={[styles.row, { gap: 8 }]}>
                  <BrutalButton
                    onPress={handleTestWebDAV}
                    disabled={webdavLoading}
                    variant="secondary"
                    style={{ flex: 1 }}
                    icon={<Ionicons name="wifi" size={20} color={colors.black} />}
                  >
                    TEST
                  </BrutalButton>
                  <BrutalButton
                    onPress={handleSaveWebDAV}
                    disabled={webdavLoading}
                    loading={webdavLoading}
                    variant="primary"
                    style={{ flex: 1 }}
                    icon={!webdavLoading && <Ionicons name="save" size={20} color={colors.white} />}
                  >
                    SAVE
                  </BrutalButton>
                </View>

                <View style={[
                  {
                    backgroundColor: colors.gray100,
                    borderWidth: 2,
                    borderColor: colors.gray300,
                    padding: 12,
                  }
                ]}>
                  <Text style={[
                    styles.textXs,
                    styles.fontBold,
                    styles.textGray700,
                    styles.uppercase,
                    { marginBottom: 4 }
                  ]}>
                    POPULAR PROVIDERS
                  </Text>
                  <Text style={[
                    styles.textXs,
                    styles.fontBold,
                    styles.textGray600,
                    { lineHeight: 16 }
                  ]}>
                    • Nextcloud/ownCloud{'\n'}
                    • Mail.ru Cloud{'\n'}
                    • Yandex.Disk{'\n'}
                    • Box.com
                  </Text>
                </View>
              </View>
            </BrutalCard>
          )}

          {/* App Information */}
          <BrutalCard title="APP INFO" titleBg={colors.purple600}>
            <View style={{ gap: 12 }}>
              <View style={[styles.row, styles.spaceBetween]}>
                <Text style={[
                  styles.textSm,
                  styles.fontBold,
                  styles.textGray700,
                  styles.uppercase
                ]}>
                  VERSION
                </Text>
                <Text style={[
                  styles.textSm,
                  styles.fontBlack,
                  styles.textBlack
                ]}>
                  1.0.0
                </Text>
              </View>
              
              <View style={[styles.row, styles.spaceBetween]}>
                <Text style={[
                  styles.textSm,
                  styles.fontBold,
                  styles.textGray700,
                  styles.uppercase
                ]}>
                  FORMAT
                </Text>
                <Text style={[
                  styles.textSm,
                  styles.fontBlack,
                  styles.textBlack
                ]}>
                  HTML + INLINE IMAGES
                </Text>
              </View>

              <View style={[styles.row, styles.spaceBetween]}>
                <Text style={[
                  styles.textSm,
                  styles.fontBold,
                  styles.textGray700,
                  styles.uppercase
                ]}>
                  BACKEND
                </Text>
                <Text style={[
                  styles.textSm,
                  styles.fontBlack,
                  styles.textBlack
                ]}>
                  {settingsStore.settings.backendUrl ? 'CONFIGURED' : 'NOT SET'}
                </Text>
              </View>
            </View>
          </BrutalCard>
        </View>
      </ScrollView>
    </View>
  );
});

export default SettingsScreen;