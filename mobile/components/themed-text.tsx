import { StyleSheet, Text, type TextProps } from 'react-native';
import { Colors, FontFamily, FontSize } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: Colors.onSurface },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSize.bodyXl,
    lineHeight: 24,
    fontFamily: FontFamily.body,
  },
  defaultSemiBold: {
    fontSize: FontSize.bodyXl,
    lineHeight: 24,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.display,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headline,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },
});
