import { StyleSheet, Text, TextInput, type KeyboardTypeOptions } from 'react-native';
import { colors, spacing } from '../theme/colors';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  placeholder?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  placeholder,
}: TextFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },
});
