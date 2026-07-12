/**
 * Endemigo Premium Design System
 * Material Design 3 inspired light theme
 * Reference: design/code.html + design/screen.png
 */

// ─── Brand Colors ───────────────────────────────────────────────
export const BrandColors = {
  primary: '#0097D8',       // Marka Mavisi
  secondary: '#36A936',     // Doğal Yeşil
  accent: '#F26838',        // Enerji Turuncusu
} as const;

// ─── Semantic Color Palette (Material Design 3) ─────────────────
export const Colors = {
  // Primary
  primary: '#0097D8',
  primaryContainer: '#007CB2',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FCFCFF',
  primaryFixed: '#C9E6FF',
  primaryFixedDim: '#8ACEFF',
  // Opak primer tintler: Android'de elevation gölgesi yarı saydam (alpha-hex)
  // zeminin arkasından sızıp gri kutu görünümü yaratır — elevation'lı
  // yüzeylerde `${primary}XX` yerine bunları kullan.
  primaryTintSurface: '#EFF8FD',   // ≈ primary %6, beyaz üzerine
  primaryTintBorder: '#D1ECF8',    // ≈ primary %18, beyaz üzerine
  primaryTintBorderFaint: '#E0F2FA', // ≈ primary %12, beyaz üzerine

  // Secondary
  secondary: '#2B8A3E',
  secondaryContainer: '#E6F4EA',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#137333',

  // Auction
  auctionGreen: '#42b94b',

  // Tertiary / Accent
  accent: '#F26838',
  tertiary: '#A83302',
  tertiaryContainer: '#C94B1D',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#FFFBFF',
  tertiaryFixed: '#FFDBD0',

  // Error
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',
  onErrorContainer: '#93000A',

  // Surface & Background
  background: '#F8F9FA',
  surface: '#F8F9FA',
  surfaceBright: '#F8F9FA',
  surfaceDim: '#D9DADB',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainer: '#EDEEEF',
  surfaceContainerHigh: '#E7E8E9',
  surfaceContainerHighest: '#E1E3E4',
  surfaceTint: '#006491',

  // On Surface
  onSurface: '#191C1D',
  onSurfaceVariant: '#3F4850',
  onBackground: '#191C1D',

  // Inverse
  inverseSurface: '#2E3132',
  inverseOnSurface: '#F0F1F2',
  inversePrimary: '#8ACEFF',

  // Outline
  outline: '#6F7980',
  outlineVariant: '#BEC8D1',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Slate scale (for subtle UI elements)
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
} as const;

// ─── Typography ─────────────────────────────────────────────────
export const FontFamily = {
  headline: 'Raleway-SemiBold',
  headlineBlack: 'Oxygen-Bold',
  body: 'OpenSans-Regular',
  bodyMedium: 'Oxygen-Regular',
  bodySemiBold: 'OpenSans-SemiBold',
  bodyBold: 'Oxygen-Bold',
  label: 'Raleway-SemiBold',
  price: 'Oxygen-Regular',
} as const;

export const FontSize = {
  /** 10px — Tiny labels, badges */
  xs: 10,
  /** 11px — Small labels */
  sm: 11,
  /** 12px — Captions */
  caption: 12,
  /** 13px — Meta text */
  meta: 13,
  /** 14px — Body small, labels */
  body: 14,
  /** 15px — Body */
  bodyLg: 15,
  /** 16px — Body large, inputs */
  bodyXl: 16,
  /** 18px — Subheading, price */
  subheading: 18,
  /** 20px — Title small */
  titleSm: 20,
  /** 22px — Title */
  title: 22,
  /** 24px — Title large */
  titleLg: 24,
  /** 28px — Heading */
  heading: 28,
  /** 32px — Display */
  display: 32,
} as const;

// ─── Spacing ────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

// ─── Border Radius ──────────────────────────────────────────────
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
} as const;

// ─── Shadows (iOS + Android) ────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: 'rgba(0,100,145,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 3,
  },
  lg: {
    shadowColor: 'rgba(0,100,145,0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  }),
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Fonts to load (used in _layout.tsx) ────────────────────────
// Uses @expo-google-fonts packages
export { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
export { Oxygen_300Light, Oxygen_400Regular, Oxygen_700Bold } from '@expo-google-fonts/oxygen';
export { Raleway_400Regular, Raleway_600SemiBold } from '@expo-google-fonts/raleway';
export { Ubuntu_300Light } from '@expo-google-fonts/ubuntu';

export const FontAssets = {
  'OpenSans-Regular': 'OpenSans_400Regular',
  'OpenSans-SemiBold': 'OpenSans_600SemiBold',
  'Oxygen-Light': 'Oxygen_300Light',
  'Oxygen-Regular': 'Oxygen_400Regular',
  'Oxygen-Bold': 'Oxygen_700Bold',
  'Raleway-Regular': 'Raleway_400Regular',
  'Raleway-SemiBold': 'Raleway_600SemiBold',
  'Ubuntu-Light': 'Ubuntu_300Light',
} as const;
