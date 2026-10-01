import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConversationSummary } from '../types/chat';
import { colors, spacing } from '../theme/colors';
import { Avatar, AvatarBadge } from './Avatar';

type ConversationItemProps = {
  item: ConversationSummary;
  onPress: () => void;
};

export function ConversationItem({ item, onPress }: ConversationItemProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar uri={item.photoUrl} name={item.title} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <AvatarBadge label={item.type === 'direct' ? 'Direta' : 'Grupo'} />
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.preview || 'Nenhuma mensagem ainda'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  preview: {
    color: colors.muted,
    fontSize: 14,
  },
});
