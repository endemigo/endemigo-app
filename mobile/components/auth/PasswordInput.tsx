import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry' | 'style'> {
  /** Style of the outer wrapper (border, background) — mirrors each screen's inputWrapper. */
  wrapperStyle?: StyleProp<ViewStyle>;
  /** Style of the TextInput itself. */
  inputStyle?: StyleProp<TextStyle>;
}

export function PasswordInput({ wrapperStyle, inputStyle, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[wrapperStyle, styles.wrapper]}>
      <TextInput
        {...inputProps}
        style={[inputStyle, styles.input]}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={Colors.slate400}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  toggle: {
    paddingHorizontal: Spacing.base,
  },
});
