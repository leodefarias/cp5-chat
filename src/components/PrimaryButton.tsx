import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme/colors';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
};

export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, variant === 'ghost' ? styles.ghost : styles.primary, inactive && styles.inactive]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inactive: {
    opacity: 0.55,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
