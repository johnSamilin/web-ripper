import React from 'react';
import { TouchableOpacity, Text, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { styles, colors } from '../styles/globalStyles';

interface BrutalButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function BrutalButton({
  children,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  loading = false,
  icon
}: BrutalButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary': return styles.buttonPrimary;
      case 'secondary': return styles.buttonSecondary;
      case 'success': return styles.buttonSuccess;
      case 'warning': return styles.buttonWarning;
      case 'danger': return styles.buttonDanger;
      default: return styles.buttonPrimary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return colors.white;
      case 'danger': return colors.white;
      default: return colors.black;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 8 };
      case 'lg': return { paddingVertical: 20, paddingHorizontal: 32 };
      default: return {};
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.brutalButton,
        getVariantStyle(),
        getSizeStyle(),
        isDisabled && { backgroundColor: colors.gray400 },
        style
      ]}
      activeOpacity={0.8}
    >
      <View style={[styles.row, styles.alignCenter, { gap: 12 }]}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : icon ? (
          icon
        ) : null}
        <Text style={[
          styles.textBase,
          styles.fontBlack,
          styles.uppercase,
          { 
            color: isDisabled ? colors.white : getTextColor(), 
            letterSpacing: size === 'sm' ? 1 : 2,
            fontSize: size === 'sm' ? 12 : 16
          },
          textStyle
        ]}>
          {typeof children === 'string' ? children : children}
        </Text>
      </View>
    </TouchableOpacity>
  );
}