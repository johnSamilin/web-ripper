import React, { useState } from 'react';
import { TextInput, View, Text, ViewStyle, TextStyle, Platform } from 'react-native';
import { styles, colors } from '../styles/globalStyles';

interface BrutalInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export default function BrutalInput({
  value,
  onChangeText,
  placeholder,
  label,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  style,
  inputStyle,
  disabled = false,
  icon
}: BrutalInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={style}>
      {label && (
        <Text style={[
          styles.textSm,
          styles.fontBlack,
          styles.textBlack,
          styles.uppercase,
          { letterSpacing: 2, marginBottom: 8 }
        ]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.brutalInput,
        isFocused && {
          backgroundColor: colors.yellowBg,
          borderColor: colors.red500,
        },
        disabled && {
          backgroundColor: colors.gray200,
          borderColor: colors.gray400,
        },
        icon && { paddingLeft: 48 },
        multiline && { height: numberOfLines * 24 + 24 }
      ]}>
        {icon && (
          <View style={{
            position: 'absolute',
            left: 12,
            top: 12,
            zIndex: 1
          }}>
            {icon}
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray500}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            {
              flex: 1,
              fontSize: 16,
              fontWeight: '700',
              color: colors.black,
              fontFamily: styles.textBase.fontFamily,
              ...(Platform.OS === 'web' && { outline: 'none' }),
            },
            inputStyle
          ]}
        />
      </View>
    </View>
  );
}