import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  mentionLabel: string;
  onMention: (() => void) | null;
  onClearMention: () => void;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  sending,
  mentionLabel,
  onMention,
  onClearMention,
}: ChatInputProps) {
  return (
    <View style={styles.wrapper}>
      {mentionLabel ? (
        <Pressable onPress={onClearMention} style={styles.chip}>
          <Text style={styles.chipText}>Para {mentionLabel} · remover</Text>
        </Pressable>
      ) : null}
      <View style={styles.row}>
        {onMention ? (
          <Pressable onPress={onMention} style={styles.mention}>
            <Text style={styles.mentionText}>@</Text>
          </Pressable>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Mensagem"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={onSend} disabled={sending || !value.trim()} style={styles.send}>
          <Text style={styles.sendText}>{sending ? '...' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  mention: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  sendText: {
    color: colors.text,
    fontWeight: '700',
  },
});
