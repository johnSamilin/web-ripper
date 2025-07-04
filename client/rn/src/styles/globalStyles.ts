import { StyleSheet, Platform } from 'react-native';

// Brutal color palette
export const colors = {
  // Primary colors
  black: '#000000',
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  
  // Accent colors
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  yellow400: '#facc15',
  yellow500: '#eab308',
  yellow600: '#d97706',
  purple500: '#a855f7',
  purple600: '#9333ea',
  purple700: '#7c3aed',
  
  // Background variants
  redBg: '#fee2e2',
  greenBg: '#dcfce7',
  blueBg: '#dbeafe',
  yellowBg: '#fef3c7',
  purpleBg: '#f3e8ff',
};

// Typography
export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }),
  fontFamilyMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
  }),
};

// Brutal shadows
export const shadows = {
  brutal: {
    shadowColor: colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  brutalLg: {
    shadowColor: colors.black,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  brutalXl: {
    shadowColor: colors.black,
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 16,
  },
};

// Global styles
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  
  // Layout
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  alignCenter: {
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  
  // Spacing
  p4: { padding: 16 },
  p6: { padding: 24 },
  px4: { paddingHorizontal: 16 },
  py4: { paddingVertical: 16 },
  m4: { margin: 16 },
  mb4: { marginBottom: 16 },
  mt4: { marginTop: 16 },
  
  // Typography
  textXs: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
  },
  textSm: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
  textBase: {
    fontSize: 16,
    fontFamily: typography.fontFamily,
  },
  textLg: {
    fontSize: 18,
    fontFamily: typography.fontFamily,
  },
  textXl: {
    fontSize: 20,
    fontFamily: typography.fontFamily,
  },
  text2xl: {
    fontSize: 24,
    fontFamily: typography.fontFamily,
  },
  text3xl: {
    fontSize: 30,
    fontFamily: typography.fontFamily,
  },
  
  fontBold: {
    fontWeight: '700',
  },
  fontBlack: {
    fontWeight: '900',
  },
  textCenter: {
    textAlign: 'center',
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  
  // Colors
  textBlack: { color: colors.black },
  textWhite: { color: colors.white },
  textGray600: { color: colors.gray600 },
  textGray700: { color: colors.gray700 },
  textRed600: { color: colors.red600 },
  textGreen600: { color: colors.green600 },
  textBlue600: { color: colors.blue600 },
  
  // Backgrounds
  bgWhite: { backgroundColor: colors.white },
  bgBlack: { backgroundColor: colors.black },
  bgGray100: { backgroundColor: colors.gray100 },
  bgGray200: { backgroundColor: colors.gray200 },
  bgRed500: { backgroundColor: colors.red500 },
  bgGreen500: { backgroundColor: colors.green500 },
  bgBlue600: { backgroundColor: colors.blue600 },
  bgYellow400: { backgroundColor: colors.yellow400 },
  bgPurple600: { backgroundColor: colors.purple600 },
  
  // Borders
  border4: {
    borderWidth: 4,
    borderColor: colors.black,
  },
  borderRed: {
    borderColor: colors.red500,
  },
  borderGreen: {
    borderColor: colors.green500,
  },
  borderBlue: {
    borderColor: colors.blue600,
  },
  borderYellow: {
    borderColor: colors.yellow400,
  },
  
  // Brutal card
  brutalCard: {
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.black,
    ...shadows.brutal,
  },
  
  // Brutal button base
  brutalButton: {
    borderWidth: 4,
    borderColor: colors.black,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.brutal,
  },
  
  // Button variants
  buttonPrimary: {
    backgroundColor: colors.black,
  },
  buttonSecondary: {
    backgroundColor: colors.gray200,
  },
  buttonSuccess: {
    backgroundColor: colors.green500,
  },
  buttonWarning: {
    backgroundColor: colors.yellow400,
  },
  buttonDanger: {
    backgroundColor: colors.red500,
  },
  
  // Input
  brutalInput: {
    borderWidth: 4,
    borderColor: colors.black,
    backgroundColor: colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: '700',
    color: colors.black,
  },
  
  // Focus states (for web)
  ...(Platform.OS === 'web' && {
    inputFocus: {
      backgroundColor: colors.yellowBg,
      borderColor: colors.red500,
      outline: 'none',
    },
  }),
});