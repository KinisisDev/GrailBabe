import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface VaultItem {
  id: string; name: string; set_name?: string; category: string;
  condition: string; quantity: number; purchase_price?: number;
  current_value_usd?: number; image_url?: string; is_grail: boolean;
}

interface Props { item: VaultItem; onPress?: () => void }

export function VaultItemCard({ item, onPress }: Props) {
  const gainLoss =
    item.purchase_price && item.current_value_usd
      ? ((item.current_value_usd - item.purchase_price) / item.purchase_price) * 100
      : null;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.imagePlaceholder}><text style={styles.emoji}>🃏</text></View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.value}>
          {item.current_value_usd != null ? `$${item.current_value_usd.toFixed(2)}` : '—'}
        </Text>
        {gainLoss != null && (
          <Text style={{ color: gainLoss >= 0 ? '#10b981' : '#ef4444', fontSize: 12 }}>
            {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(1)}%
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#171717', borderRadius: 12, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  image: { width: '100%', height: 120 },
  imagePlaceholder: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#262626' },
  emoji: { fontSize: 32 },
  info: { padding: 8 },
  name: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { color: '#a3a3a3', fontSize: 12 },
});
