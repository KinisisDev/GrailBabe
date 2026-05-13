import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatTileProps {
  title: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}

export function StatTile({ title, value, subtitle, highlight = false }: StatTileProps) {
  const colors = useColors();

  const isPositive = highlight && value.startsWith("+");
  const isNegative = highlight && value.startsWith("-");
  const valueColor = isPositive ? colors.neonGreen : isNegative ? colors.neonRed : highlight ? colors.neonYellow : colors.foreground;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
