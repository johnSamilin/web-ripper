import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { logger, LogEntry } from '../utils/logger';
import BrutalButton from './BrutalButton';
import { styles, colors } from '../styles/globalStyles';

interface LogDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function LogDrawer({ visible, onClose }: LogDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Subscribe to log updates
    const unsubscribe = logger.subscribe(setLogs);
    
    // Get initial logs
    setLogs(logger.getLogs());

    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return colors.red500;
      case 'warn': return colors.yellow500;
      case 'info': return colors.blue500;
      default: return colors.gray700;
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'close-circle';
      case 'warn': return 'warning';
      case 'info': return 'information-circle';
      default: return 'radio-button-on';
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => logger.clearLogs()
        }
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const logsText = logger.exportLogs();
      
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(logsText);
        Alert.alert('Copied', 'Logs copied to clipboard');
      } else {
        await Share.share({
          message: logsText,
          title: 'Web Ripper Logs'
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const handleCopyLog = async (log: LogEntry) => {
    try {
      const logText = `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${
        log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''
      }`;
      await Clipboard.setStringAsync(logText);
      Alert.alert('Copied', 'Log entry copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy log');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (Platform.OS === 'web') {
    return null; // Don't show on web
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[
          styles.row, 
          styles.spaceBetween, 
          styles.alignCenter, 
          styles.p4,
          { borderBottomWidth: 4, borderBottomColor: colors.black }
        ]}>
          <View style={[styles.row, styles.alignCenter, { gap: 16 }]}>
            <View style={[
              {
                width: 48,
                height: 48,
                backgroundColor: colors.black,
                borderWidth: 4,
                borderColor: colors.green500,
                transform: [{ rotate: '12deg' }],
              },
              styles.center
            ]}>
              <Ionicons name="terminal" size={24} color={colors.green500} />
            </View>
            <View>
              <Text style={[
                styles.text2xl,
                styles.fontBlack,
                styles.textBlack,
                styles.uppercase,
                { letterSpacing: 2 }
              ]}>
                DEBUG LOGS
              </Text>
              <Text style={[
                styles.textSm,
                styles.fontBold,
                styles.textGray600,
                styles.uppercase,
                { letterSpacing: 3 }
              ]}>
                {filteredLogs.length} ENTRIES
              </Text>
            </View>
          </View>
          
          <BrutalButton
            onPress={onClose}
            variant="secondary"
            size="sm"
            icon={<Ionicons name="close" size={20} color={colors.black} />}
          >
            CLOSE
          </BrutalButton>
        </View>

        {/* Filter Buttons */}
        <View style={[styles.row, styles.p4, { gap: 8, flexWrap: 'wrap' }]}>
          {(['all', 'log', 'info', 'warn', 'error'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setFilter(level)}
              style={[
                {
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 2,
                  borderColor: colors.black,
                  backgroundColor: filter === level ? colors.black : colors.gray200,
                }
              ]}
            >
              <Text style={[
                styles.textXs,
                styles.fontBlack,
                styles.uppercase,
                { 
                  color: filter === level ? colors.white : colors.black,
                  letterSpacing: 1
                }
              ]}>
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={[styles.row, styles.px4, { gap: 8, marginBottom: 16 }]}>
          <BrutalButton
            onPress={handleClearLogs}
            variant="warning"
            size="sm"
            style={{ flex: 1 }}
            icon={<Ionicons name="trash" size={16} color={colors.black} />}
          >
            CLEAR
          </BrutalButton>
          <BrutalButton
            onPress={handleExportLogs}
            variant="secondary"
            size="sm"
            style={{ flex: 1 }}
            icon={<Ionicons name="share" size={16} color={colors.black} />}
          >
            EXPORT
          </BrutalButton>
        </View>

        {/* Logs List */}
        <ScrollView 
          style={styles.flex1} 
          contentContainerStyle={styles.p4}
          showsVerticalScrollIndicator={true}
        >
          {filteredLogs.length === 0 ? (
            <View style={[styles.center, { paddingVertical: 40 }]}>
              <Ionicons name="document-text" size={48} color={colors.gray400} />
              <Text style={[
                styles.textLg,
                styles.fontBold,
                styles.textGray500,
                styles.uppercase,
                { marginTop: 16, letterSpacing: 2 }
              ]}>
                NO LOGS
              </Text>
              <Text style={[
                styles.textSm,
                styles.fontBold,
                styles.textGray400,
                { marginTop: 8 }
              ]}>
                {filter === 'all' ? 'No logs available' : `No ${filter} logs found`}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredLogs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  onPress={() => handleCopyLog(log)}
                  style={[
                    {
                      backgroundColor: colors.white,
                      borderWidth: 2,
                      borderColor: colors.black,
                      borderLeftWidth: 6,
                      borderLeftColor: getLogColor(log.level),
                      padding: 12,
                    }
                  ]}
                >
                  <View style={[styles.row, styles.alignCenter, { gap: 8, marginBottom: 4 }]}>
                    <Ionicons 
                      name={getLogIcon(log.level) as any} 
                      size={16} 
                      color={getLogColor(log.level)} 
                    />
                    <Text style={[
                      styles.textXs,
                      styles.fontBlack,
                      styles.uppercase,
                      { color: getLogColor(log.level), letterSpacing: 1 }
                    ]}>
                      {log.level}
                    </Text>
                    <Text style={[
                      styles.textXs,
                      styles.fontBold,
                      styles.textGray500
                    ]}>
                      {formatTime(log.timestamp)}
                    </Text>
                  </View>
                  
                  <Text style={[
                    styles.textSm,
                    styles.fontBold,
                    styles.textBlack,
                    { lineHeight: 18, marginBottom: log.data ? 8 : 0 }
                  ]}>
                    {log.message}
                  </Text>
                  
                  {log.data && (
                    <View style={[
                      {
                        backgroundColor: colors.gray100,
                        borderWidth: 1,
                        borderColor: colors.gray300,
                        padding: 8,
                        marginTop: 4,
                      }
                    ]}>
                      <Text style={[
                        styles.textXs,
                        styles.fontBold,
                        styles.textGray700,
                        { fontFamily: 'monospace' }
                      ]}>
                        {JSON.stringify(log.data, null, 2)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}