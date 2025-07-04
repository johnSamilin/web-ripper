import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, colors } from '../styles/globalStyles';

interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

export default function AlertMessage({ type, title, message }: AlertMessageProps) {
  const getAlertStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.greenBg,
          borderColor: colors.green500,
        };
      case 'error':
        return {
          backgroundColor: colors.redBg,
          borderColor: colors.red500,
        };
      case 'warning':
        return {
          backgroundColor: colors.yellowBg,
          borderColor: colors.yellow500,
        };
      case 'info':
        return {
          backgroundColor: colors.blueBg,
          borderColor: colors.blue500,
        };
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success': return colors.green700;
      case 'error': return colors.red700;
      case 'warning': return colors.yellow600;
      case 'info': return colors.blue700;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
    }
  };

  return (
    <View style={[
      {
        borderWidth: 4,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      },
      getAlertStyle()
    ]}>
      <Ionicons 
        name={getIconName() as any} 
        size={20} 
        color={getTextColor()} 
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        {title && (
          <Text style={[
            styles.textSm,
            styles.fontBlack,
            styles.uppercase,
            { color: getTextColor(), marginBottom: 4 }
          ]}>
            {title}
          </Text>
        )}
        <Text style={[
          styles.textSm,
          styles.fontBold,
          { color: getTextColor() }
        ]}>
          {message}
        </Text>
      </View>
    </View>
  );
}