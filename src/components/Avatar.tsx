import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const fallback = require('../../assets/icon.png') as number;

type AvatarProps = {
  uri: string;
  name: string;
  size?: number;
  onPress?: () => void;
};

export function Avatar({ uri, name, size = 48, onPress }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const source = !uri || failed ? fallback : { uri };
  const image = (
    <Image
      source={source}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      onError={() => setFailed(true)}
    />
  );

  if (!onPress) {
    return image;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${name || 'usuário'}`} onPress={onPress}>
      {image}
    </Pressable>
  );
}

export function AvatarBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceAlt,
  },
  badge: {
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
