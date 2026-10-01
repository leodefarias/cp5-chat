import { StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme/colors';

type ErrorMessageProps = {
  message: string;
};

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.danger,
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
});
