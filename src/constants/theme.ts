import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F8F9FA',
    backgroundSecondary: '#F1F3F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E9ECEF',
    borderSubtle: '#F1F3F5',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    primary: '#0F172A',
    primaryContrast: '#FFFFFF',
    accent: '#2563EB',
    accentMuted: '#DBEAFE',
    success: '#10B981',
    successMuted: '#D1FAE5',
    warning: '#F59E0B',
    warningMuted: '#FEF3C7',
    danger: '#EF4444',
    dangerMuted: '#FEE2E2',
    cardShadow: 'rgba(0, 0, 0, 0.04)',
    deviceConnected: '#10B981',
    deviceDisconnected: '#EF4444',
    deviceReconnecting: '#F59E0B',
  },
  dark: {
    background: '#0D0F12',
    backgroundSecondary: '#14181E',
    surface: '#1A1E24',
    surfaceElevated: '#222831',
    border: '#2A303C',
    borderSubtle: '#1F242C',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    primary: '#F9FAFB',
    primaryContrast: '#0D0F12',
    accent: '#3B82F6',
    accentMuted: '#1E3A8A',
    success: '#34D399',
    successMuted: '#064E3B',
    warning: '#FBBF24',
    warningMuted: '#78350F',
    danger: '#F87171',
    dangerMuted: '#7F1D1D',
    cardShadow: 'rgba(0, 0, 0, 0.4)',
    deviceConnected: '#34D399',
    deviceDisconnected: '#F87171',
    deviceReconnecting: '#FBBF24',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  hero: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  callout: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
};
