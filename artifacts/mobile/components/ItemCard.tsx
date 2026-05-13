import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { VaultItem } from "@/constants/demoData";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface ItemCardProps {
  item: VaultItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = () => {
    Haptics.selectionAsync();
    router.push(`/item/${item.id}`);
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
        <Text style={[styles.imageText, { color: colors.mutedForeground }]}>
          {item.category}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.setNumber} • {item.gameOrTheme}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.value, { color: colors.foreground }]}>
            ${item.currentValue.toLocaleString()}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.condition}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imagePlaceholder: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.5,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});