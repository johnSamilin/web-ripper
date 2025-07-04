import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { styles, colors } from '../styles/globalStyles';

interface BrutalCardProps {
  children: React.ReactNode;
  title?: string;
  titleBg?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function BrutalCard({ 
  children, 
  title, 
  titleBg = colors.red500, 
  style,
  titleStyle 
}: BrutalCardProps) {
  return (
    <View style={[styles.brutalCard, style]}>
      {title && (
        <View style={[{ backgroundColor: titleBg, padding: 8 }]}>
          <Text style={[
            styles.textSm,
            styles.fontBlack,
            styles.textWhite,
            styles.textCenter,
            styles.uppercase,
            { letterSpacing: 2 },
            titleStyle
          ]}>
            {title}
          </Text>
        </View>
      )}
      <View style={styles.p6}>
        {children}
      </View>
    </View>
  );
}