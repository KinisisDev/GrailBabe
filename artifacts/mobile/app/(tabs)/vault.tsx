import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListVaultItems } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { IridescentHeader } from "@/components/IridescentHeader";
import { useIsSignedIn } from "@/components/AuthGate";
import { TrademarkFooter } from "@/components/TrademarkFooter";
import { qopt } from "@/lib/api";
import { formatCurrency, conditionLabel } from "@/lib/format";

const FILTERS = ["All", "TCG", "LEGO", "Sports", "Other"] as const;

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");

  const { data: items, isLoading } = useListVaultItems(
    filter === "All" ? {} : { category: filter.toLowerCase() },
    qopt(isSignedIn),
  );

  const list = useMemo(() => {
    const base = isSignedIn && items
      ? items.map((i) => ({
          id: String(i.id),
          name: i.name,
          subtitle: `${i.category} · ${conditionLabel(i.condition)}`,
          value: i.currentValue ?? i.purchasePrice ?? 0,
          imageUri: i.photos[0] ?? null,
        }))
      : DUMMY_VAULT_ITEMS.filter(
          (i) => filter === "All" || i.category.toLowerCase() === filter.toLowerCase(),
        ).map((i) => ({
          id: i.id,
          name: i.name,
          subtitle: `${i.category} · ${i.condition}`,
          value: i.currentValue,
          imageUri: i.imageUri ?? null,
        }));
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (i) => i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q),
    );
  }, [isSignedIn, items, filter, search]);

  const totalValue = list.reduce((s, i) => s + i.value, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader
        title="The Vault"
        right={
          <Pressable onPress={() => router.push("/vault/add")} hitSlop={12}>
            <Feather name="plus" size={20} color="#0a0a0f" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100,
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Vault total</Text>
          <Text style={[styles.totalValue, { color: colors.neonGreen }]}>
            {formatCurrency(totalValue)}
          </Text>
          <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>
            {list.length} item{list.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search items"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.neonGreen : colors.card,
                    borderColor: active ? colors.neonGreen : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#0a0a0f" : colors.mutedForeground },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading && isSignedIn && (
          <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 32 }} />
        )}

        <View style={styles.grid}>
          {list.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: it.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {it.name}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {it.subtitle}
              </Text>
              <Text style={[styles.cardValue, { color: colors.neonGreen }]}>
                {formatCurrency(it.value)}
              </Text>
            </Pressable>
          ))}
          {list.length === 0 && !isLoading && (
            <View style={styles.empty}>
              <Feather name="archive" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {isSignedIn ? "Your vault is empty. Add an item to get started." : "No matching items."}
              </Text>
              <Pressable
                onPress={() => router.push("/vault/add")}
                style={({ pressed }) => [
                  styles.emptyBtn,
                  { backgroundColor: colors.neonGreen, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={{ fontFamily: "Inter_700Bold", color: "#0a0a0f" }}>Add item</Text>
              </Pressable>
            </View>
          )}
        </View>
        <TrademarkFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  totalValue: { fontFamily: "Fraunces_700Bold", fontSize: 32 },
  totalSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, marginTop: 16 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 4 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  grid: { paddingHorizontal: 14, flexDirection: "row", flexWrap: "wrap" },
  card: {
    width: "47%",
    margin: "1.5%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, minHeight: 32 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  cardValue: { fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 6 },
  empty: { width: "100%", alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
});
