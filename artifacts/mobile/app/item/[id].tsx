import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IridescentHeader } from "@/components/IridescentHeader";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const item = DUMMY_VAULT_ITEMS.find(i => i.id === id);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Item not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const profit = item.changeAmount;
  const profitPercent = item.changePct;
  const isPositive = profit >= 0;
  const deltaColor = isPositive ? colors.neonGreen : colors.neonRed;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <IridescentHeader 
          title="Item Details" 
          left={
            <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <Feather name="chevron-left" size={24} color="#0a0a0f" />
            </Pressable>
          } 
        />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.imageBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="image" size={48} color={colors.mutedForeground} />
          </View>

          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.categoryText, { color: colors.foreground }]}>{item.category}</Text>
            </View>
            <View style={[styles.conditionBadge, { borderColor: colors.accent }]}>
              <Text style={[styles.conditionText, { color: colors.accent }]}>{item.condition}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {item.gameOrTheme} {item.setNumber && `• ${item.setNumber}`}
          </Text>

          <View style={[styles.valueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>Current Value</Text>
              <Text style={[styles.currentValue, { color: colors.foreground }]}>
                ${item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>Total Return</Text>
              <Text style={[
                styles.profit, 
                { color: deltaColor }
              ]}>
                {isPositive ? "+" : ""}${Math.abs(profit).toLocaleString()} ({isPositive ? "+" : ""}{profitPercent.toFixed(1)}%)
              </Text>
            </View>
          </View>

          <View style={styles.detailsList}>
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Purchase Price</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                ${item.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Date Added</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {new Date(item.dateAdded).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.notesLabel, { color: colors.foreground }]}>Collector Notes</Text>
              <View style={[styles.notesBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.notesText, { color: colors.foreground }]}>{item.notes}</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  imageBox: {
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  conditionText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontFamily: "Fraunces_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  valueCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  valueLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  profit: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  detailsList: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  notesSection: {
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 18,
    fontFamily: "Fraunces_600SemiBold",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  notesBox: {
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
