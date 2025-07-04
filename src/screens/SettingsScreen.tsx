import React, { useState } from 'react';
import { View, ScrollView, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import BrutalCard from '../components/BrutalCard';
import BrutalButton from '../components/BrutalButton';
import BrutalInput from '../components/BrutalInput';
import AlertMessage from '../components/AlertMessage';
import { styles, colors } from '../styles/globalStyles';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings } = useSettings();
  const { logout, isAuthenticated, user } = useAuth();
  
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      await updateSettings({ backendUrl: backendUrl.trim() });
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
      const response = await fetch(`${backendUrl.trim()}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Connection Successful', `Server is running: ${data.status}`);
      } else {
        throw new Error('Server returned error');
      }
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            onBack();
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.spaceBetween, styles.alignCenter, styles.p4]}>
      <View style={[styles.row, styles.alignCenter, { gap: 16 }]}>
        <Text style={[
          styles.text2xl,
          styles.fontBlack,
          styles.textBlack,
          styles.uppercase,
          { letterSpacing: 2 }
        ]}>
          SETTINGS
        </Text>
      </View>
      
      <BrutalButton
        onPress={onBack}
        variant="secondary"
        size="sm"
        icon={<Ionicons name="arrow-back" size={20} color={colors.black} />}
      >
        BACK
      </BrutalButton>
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
                placeholder="http://localhost:3001"
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
          {isAuthenticated && user && (
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
                      {user.username}
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
                      {user.email}
                    </Text>
                  </View>
                </View>

                <View style={[styles.row, styles.alignCenter, { gap: 8 }]}>
                  <View style={[
                    {
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: user.hasWebDAV ? colors.green500 : colors.red500,
                    }
                  ]} />
                  <Text style={[
                    styles.textSm,
                    styles.fontBold,
                    styles.textGray700,
                    styles.uppercase
                  ]}>
                    WebDAV: {user.hasWebDAV ? 'CONFIGURED' : 'NOT CONFIGURED'}
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
                  {settings.backendUrl ? 'CONFIGURED' : 'NOT SET'}
                </Text>
              </View>
            </View>
          </BrutalCard>
        </View>
      </ScrollView>
    </View>
  );
}