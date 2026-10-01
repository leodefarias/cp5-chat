import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage as ChatMessageModel } from '../types/chat';
import { colors, spacing } from '../theme/colors';

type ChatMessageProps = {
  message: ChatMessageModel;
  mine: boolean;
  authorName: string;
  showAuthor: boolean;
  targetName: string;
};

export function ChatMessage({ message, mine, authorName, showAuthor, targetName }: ChatMessageProps) {
  return (
    <View style={[styles.row, mine ? styles.mineRow : styles.theirRow]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {showAuthor && !mine ? <Text style={styles.author}>{authorName}</Text> : null}
        {message.target.type === 'member' ? <Text style={styles.target}>Para {targetName}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: spacing.md,
  },
  mineRow: {
    alignItems: 'flex-end',
  },
  theirRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  mine: {
    backgroundColor: colors.mine,
  },
  theirs: {
    backgroundColor: colors.theirs,
  },
  author: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  target: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
