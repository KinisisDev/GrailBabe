import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { DUMMY_VAULT_ITEMS, Category } from "@/constants/demoData";
import { ItemCard } from "@/components/ItemCard";
import { IridescentHeader } from "@/components/IridescentHeader";

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [filter, setFilter] = useState<Category | "ALL">("ALL");

  const filteredItems = filter === "ALL" 
    ? DUMMY_VAULT_ITEMS 
    : DUMMY_VAULT_ITEMS.filter(item => item.category === filter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="Vault" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Vault</Text>
        <View style={styles.filterRow}>
          {(["ALL", "LEGO", "TCG"] as const).map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: filter === cat ? colors.primary : colors.card,
                  borderColor: filter === cat ? colors.primary : colors.border
                }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: filter === cat ? colors.primaryForeground : colors.mutedForeground }
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : insets.bottom + 100 }
        ]}
      >
        <View style={styles.grid}>
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: "Fraunces_700Bold",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
});
