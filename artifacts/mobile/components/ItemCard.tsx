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

  const isPositive = item.changeAmount >= 0;
  const deltaColor = isPositive ? colors.neonGreen : colors.neonRed;

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: colors.card,
          borderColor: pressed ? `rgba(0, 212, 255, 0.4)` : colors.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
        <Text style={[styles.imageText, { color: colors.mutedForeground }]}>
          {item.category}
        </Text>
        <View style={[styles.badge, { borderColor: `rgba(245, 177, 58, 0.4)` }]}>
           <Text style={[styles.badgeText, { color: colors.neonAmber }]}>GRAIL</Text>
        </View>
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
          <Text style={[styles.deltaText, { color: deltaColor }]}>
            {isPositive ? "+" : ""}${Math.abs(item.changeAmount).toLocaleString()}
          </Text>
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
    position: "relative",
  },
  imageText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
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
  deltaText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
