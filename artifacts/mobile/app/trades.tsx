import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useListTrades, type TradePost } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn } from "@/components/AuthGate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const KINDS = ["all", "trade", "sell", "buy"] as const;

const DEMO_TRADES: TradePost[] = [
  {
    id: 1,
    userId: "u1",
    userName: "kaibacorp",
    title: "Have BGS 9.5 Charizard, want LEGO UCS sets",
    description: "Looking for Star Wars UCS, condition matters.",
    category: "TCG",
    condition: "BGS 9.5",
    askingPrice: null,
    photos: [],
    kind: "trade",
    wantedItems: ["UCS Falcon", "UCS Star Destroyer"],
    status: "open",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 2,
    userId: "u2",
    userName: "brickmaster99",
    title: "Selling sealed Hogwarts Castle",
    description: "Mint box, original packaging.",
    category: "LEGO",
    condition: "Sealed",
    askingPrice: 480,
    photos: [],
    kind: "sell",
    wantedItems: [],
    status: "open",
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
];

export default function TradesScreen() {
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");

  const { data, isLoading } = useListTrades({});
  const filtered = (data ?? []).filter((t) => kind === "all" || t.kind === kind);
  const list = filtered.length > 0 ? filtered : (!isSignedIn ? DEMO_TRADES.filter((t) => kind === "all" || t.kind === kind) : []);

  return (
    <PageShell title="Trading Board">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {KINDS.map((k) => {
          const active = k === kind;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.neonGreen : colors.card,
                  borderColor: active ? colors.neonGreen : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#0a0a0f" : colors.mutedForeground },
                ]}
              >
                {k}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && <ActivityIndicator color={colors.neonGreen} style={{ marginTop: 24 }} />}

      <View style={styles.list}>
        {list.map((t) => (
          <View
            key={t.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.metaRow}>
              <Text style={[styles.kind, { color: colors.neonGreen, borderColor: colors.neonGreen }]}>
                {t.kind}
              </Text>
              <Text style={[styles.user, { color: colors.mutedForeground }]}>
                @{t.userName} · {formatRelativeDate(t.createdAt)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
            {t.description && (
              <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={3}>
                {t.description}
              </Text>
            )}
            <View style={styles.footer}>
              <Text style={[styles.cat, { color: colors.mutedForeground }]}>
                {t.category} · {t.condition}
              </Text>
              {t.askingPrice != null && (
                <Text style={[styles.price, { color: colors.neonYellow }]}>
                  {formatCurrency(t.askingPrice)}
                </Text>
              )}
            </View>
          </View>
        ))}
        {list.length === 0 && !isLoading && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No trade posts yet.
          </Text>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize" },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kind: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  user: { fontFamily: "Inter_400Regular", fontSize: 11 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 16, marginTop: 6 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  cat: { fontFamily: "Inter_500Medium", fontSize: 12 },
  price: { fontFamily: "Fraunces_700Bold", fontSize: 16 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
});
