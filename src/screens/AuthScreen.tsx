import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import BrutalCard from '../components/BrutalCard';
import BrutalButton from '../components/BrutalButton';
import BrutalInput from '../components/BrutalInput';
import AlertMessage from '../components/AlertMessage';
import { styles, colors } from '../styles/globalStyles';

interface AuthScreenProps {
  onBack: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps) {
  const { login, register } = useAuth();
  const { settings } = useSettings();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!settings.backendUrl) {
      setError('Backend URL not configured. Please go to settings first.');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    if (!isLogin && !email.trim()) {
      setError('Email is required for registration');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(username.trim(), password, settings.backendUrl);
      } else {
        await register(username.trim(), email.trim(), password, settings.backendUrl);
      }
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.spaceBetween, styles.alignCenter, styles.p4]}>
      <View style={[styles.row, styles.alignCenter, { gap: 16 }]}>
        <View style={[
          {
            width: 64,
            height: 64,
            backgroundColor: colors.black,
            borderWidth: 4,
            borderColor: colors.red500,
            transform: [{ rotate: '12deg' }],
          },
          styles.center
        ]}>
          <Ionicons name="shield" size={32} color={colors.red500} />
        </View>
        <View>
          <Text style={[
            styles.text3xl,
            styles.fontBlack,
            styles.textBlack,
            styles.uppercase,
            { letterSpacing: 2, transform: [{ skewX: '-5deg' }] }
          ]}>
            WEB RIPPER
          </Text>
          <Text style={[
            styles.textSm,
            styles.fontBold,
            styles.textRed600,
            styles.uppercase,
            { letterSpacing: 3 }
          ]}>
            SECURE ACCESS
          </Text>
        </View>
      </View>
      
      <BrutalButton
        onPress={onBack}
        variant="secondary"
        size="sm"
        icon={<Ionicons name="close" size={20} color={colors.black} />}
      >
        CLOSE
      </BrutalButton>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.flex1} contentContainerStyle={[styles.p4, styles.center]}>
        <View style={{ width: '100%', maxWidth: 400 }}>
          <BrutalCard 
            title={isLogin ? 'AUTHENTICATE' : 'CREATE ACCOUNT'} 
            titleBg={colors.red500}
          >
            <View style={{ gap: 16 }}>
              <BrutalInput
                value={username}
                onChangeText={setUsername}
                placeholder={isLogin ? "username" : "username or email"}
                label={`USERNAME ${!isLogin ? '/ EMAIL' : ''}`}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {!isLogin && (
                <BrutalInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  label="EMAIL"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              <BrutalInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                label="PASSWORD"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {error && (
                <AlertMessage type="error" message={error} />
              )}

              <BrutalButton
                onPress={handleSubmit}
                disabled={loading}
                loading={loading}
                variant="primary"
                icon={!loading && <Ionicons name="key" size={20} color={colors.white} />}
              >
                {loading ? 'PROCESSING...' : (isLogin ? 'BREACH SECURITY' : 'CREATE ACCOUNT')}
              </BrutalButton>
            </View>

            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 4, borderTopColor: colors.gray200, gap: 12 }}>
              <BrutalButton
                onPress={toggleMode}
                variant="secondary"
              >
                {isLogin ? 'NEED ACCOUNT? REGISTER' : 'HAVE ACCOUNT? LOGIN'}
              </BrutalButton>
              
              <BrutalButton
                onPress={onBack}
                variant="secondary"
              >
                CONTINUE WITHOUT ACCOUNT
              </BrutalButton>
            </View>
          </BrutalCard>
        </View>
      </ScrollView>
    </View>
  );
}