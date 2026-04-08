/**
 * Simplified theme color hook for the Endemigo premium design system.
 * Since we use a flat color palette (no light/dark mode yet),
 * this hook returns the color directly from the Colors constant.
 */

import { Colors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  // If a specific color is provided via props, use it
  if (props.light) {
    return props.light;
  }

  return Colors[colorName];
}
