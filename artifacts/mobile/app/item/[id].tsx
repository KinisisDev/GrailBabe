import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetVaultItem, useGetVaultItemPrices } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { useIsSignedIn } from "@/components/AuthGate";
import { PageShell } from "@/components/PageShell";
import { qopt } from "@/lib/api";
import { formatCurrency, formatPercent, formatRelativeDate, conditionLabel } from "@/lib/format";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const numericId = Number(id);
  const isNumeric = !Number.isNaN(numericId);

  const { data: detail, isLoading } = useGetVaultItem(numericId, qopt(isSignedIn && isNumeric));
  const { data: prices } = useGetVaultItemPrices(numericId, qopt(isSignedIn && isNumeric));

  const demoItem = DUMMY_VAULT_ITEMS.find((i) => i.id === id);

  const item =
    detail?.item ??
    (demoItem
      ? {
          id: 0,
          name: demoItem.name,
          brand: demoItem.gameOrTheme,
          category: demoItem.category,
          condition: demoItem.condition,
          purchasePrice: demoItem.purchasePrice,
          currentValue: demoItem.currentValue,
          notes: demoItem.notes,
          photos: [] as string[],
          tags: [] as string[],
          purchaseDate: demoItem.dateAdded,
          createdAt: demoItem.dateAdded,
          updatedAt: demoItem.dateAdded,
        }
      : null);

  if (!item && !isLoading) {
    return (
      <PageShell title="Item">
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 8 }}>
            Item not found
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.neonBlue, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
          </Pressable>
        </View>
      </PageShell>
    );
  }

  if (!item) {
    return (
      <PageShell title="Item">
        <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 40 }} />
      </PageShell>
    );
  }

  const value = item.currentValue ?? 0;
  const cost = item.purchasePrice ?? 0;
  const gain = value - cost;
  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
  const positive = gain >= 0;
  const deltaColor = positive ? colors.neonGreen : colors.neonRed;

  return (
    <PageShell title="Item Details">
      <View style={[styles.thumb, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="image" size={48} color={colors.mutedForeground} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.cat, { color: colors.neonGreen }]}>{item.category}</Text>
        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
        {item.brand && (
          <Text style={[styles.brand, { color: colors.mutedForeground }]}>{item.brand}</Text>
        )}

        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Current value</Text>
            <Text style={[styles.priceVal, { color: colors.foreground }]}>{formatCurrency(value)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Gain</Text>
            <Text style={[styles.priceVal, { color: deltaColor }]}>{formatCurrency(gain)}</Text>
            <Text style={[styles.pricePct, { color: deltaColor }]}>{formatPercent(gainPct)}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta label="Condition" value={conditionLabel(item.condition)} />
          <Meta label="Cost basis" value={formatCurrency(cost)} />
          <Meta label="Added" value={formatRelativeDate(item.createdAt)} />
          {item.purchaseDate && <Meta label="Purchased" value={formatRelativeDate(item.purchaseDate)} />}
        </View>

        {item.notes && (
          <View style={[styles.notes, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{item.notes}</Text>
          </View>
        )}

        {prices && prices.length > 0 && (
          <View style={styles.notes}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>
              Recent prices
            </Text>
            {prices.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.priceRow}>
                <Text style={[styles.priceSrc, { color: colors.mutedForeground }]}>
                  {p.source} · {formatRelativeDate(p.recordedAt)}
                </Text>
                <Text style={[styles.priceVal2, { color: colors.foreground }]}>
                  {formatCurrency(p.price)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </PageShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metaCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    margin: 16,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 20, gap: 6 },
  cat: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontFamily: "Fraunces_700Bold", fontSize: 26, marginTop: 4 },
  brand: { fontFamily: "Inter_500Medium", fontSize: 13 },
  priceCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  priceLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  priceVal: { fontFamily: "Fraunces_700Bold", fontSize: 22, marginTop: 2 },
  pricePct: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metaCell: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  notes: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  notesLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  notesText: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceSrc: { fontFamily: "Inter_400Regular", fontSize: 12 },
  priceVal2: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  center: { alignItems: "center", padding: 60 },
});
