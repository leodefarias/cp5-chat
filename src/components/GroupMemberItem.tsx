import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { Avatar } from './Avatar';

type GroupMemberItemProps = {
  name: string;
  photoUrl: string;
  owner: boolean;
  selected?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  onPress?: () => void;
  onAction?: () => void;
};

export function GroupMemberItem({
  name,
  photoUrl,
  owner,
  selected = false,
  disabled = false,
  actionLabel,
  onPress,
  onAction,
}: GroupMemberItemProps) {
  return (
    <Pressable style={[styles.row, selected && styles.selected, disabled && styles.disabled]} onPress={onPress} disabled={!onPress || disabled}>
      <Avatar uri={photoUrl} name={name} size={42} />
      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        {owner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  selected: {
    backgroundColor: colors.surfaceAlt,
  },
  disabled: {
    opacity: 0.45,
  },
  body: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  owner: {
    color: colors.primary,
    fontSize: 12,
  },
  action: {
    color: colors.danger,
    fontWeight: '700',
  },
});
