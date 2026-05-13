import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetDashboard } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { DUMMY_ACTIVITY, DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { StatTile } from "@/components/StatTile";
import { ActivityRow } from "@/components/ActivityRow";
import { IridescentHeader } from "@/components/IridescentHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/format";

const QUICK_LINKS: Array<{ label: string; icon: keyof typeof Feather.glyphMap; href: "/scanner" | "/grail" | "/trades" | "/portfolio" | "/messages" | "/billing" | "/settings" | "/my-trades"; tint: keyof ReturnType<typeof useColors> }> = [
  { label: "Scanner", icon: "camera", href: "/scanner", tint: "neonBlue" },
  { label: "Grail", icon: "star", href: "/grail", tint: "neonYellow" },
  { label: "Trades", icon: "repeat", href: "/trades", tint: "neonGreen" },
  { label: "Portfolio", icon: "trending-up", href: "/portfolio", tint: "neonAmber" },
  { label: "Messages", icon: "mail", href: "/messages", tint: "neonRed" },
  { label: "Billing", icon: "credit-card", href: "/billing", tint: "neonBlue" },
];

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useIsSignedIn();

  const { data, isLoading } = useGetDashboard(qopt(isSignedIn));

  // Demo fallback computation
  const demoTotalValue = DUMMY_VAULT_ITEMS.reduce((s, i) => s + i.currentValue, 0);
  const demoTotalCost = DUMMY_VAULT_ITEMS.reduce((s, i) => s + i.purchasePrice, 0);
  const demoGain = demoTotalValue - demoTotalCost;
  const demoGainPct = demoTotalCost > 0 ? (demoGain / demoTotalCost) * 100 : 0;

  const portfolio = isSignedIn && data
    ? data.portfolio
    : { totalValue: demoTotalValue, totalCost: demoTotalCost, gain: demoGain, gainPct: demoGainPct, itemCount: DUMMY_VAULT_ITEMS.length };

  const recentItems = isSignedIn && data
    ? data.recentItems.slice(0, 4).map((i) => ({
        id: String(i.id),
        title: i.name,
        subtitle: i.category + (i.brand ? ` · ${i.brand}` : ""),
        value: formatCurrency(i.currentValue ?? i.purchasePrice ?? 0),
      }))
    : DUMMY_VAULT_ITEMS.slice(0, 4).map((i) => ({
        id: i.id,
        title: i.name,
        subtitle: `${i.category} · ${i.gameOrTheme ?? ""}`,
        value: formatCurrency(i.currentValue),
      }));

  const activity = isSignedIn && data
    ? data.activity.slice(0, 5).map((a) => ({
        id: a.id,
        type: "addition" as const,
        title: a.kind.replace(/_/g, " "),
        subtitle: a.message,
        date: a.createdAt,
      }))
    : DUMMY_ACTIVITY;

  const positive = portfolio.gain >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="GrailBabe" logo />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : insets.bottom + 100 },
        ]}
      >
        {!isSignedIn && isLoaded && <SignInPrompt />}

        <View style={styles.heroBlock}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back</Text>
          <Text style={[styles.balance, { color: colors.foreground }]}>
            {formatCurrency(portfolio.totalValue)}
          </Text>
          <Text style={[styles.balanceSub, { color: positive ? colors.neonGreen : colors.neonRed }]}>
            {formatCurrency(portfolio.gain)} ({formatPercent(portfolio.gainPct)})
          </Text>
          {isSignedIn && isLoading && (
            <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 8 }} />
          )}
        </View>

        <View style={styles.statsGrid}>
          <StatTile title="Cost basis" value={formatCompactCurrency(portfolio.totalCost)} highlight />
          <StatTile title="Items" value={String(portfolio.itemCount)} highlight />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <SectionTitle>Quick actions</SectionTitle>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {QUICK_LINKS.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => router.push(q.href)}
              style={({ pressed }) => [
                styles.quickChip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name={q.icon} size={18} color={colors[q.tint] as string} />
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{q.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <SectionTitle>Recent additions</SectionTitle>
        </View>
        <View style={styles.list}>
          {recentItems.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: it.id } })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {it.title}
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {it.subtitle}
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.neonGreen }]}>{it.value}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <SectionTitle>Activity</SectionTitle>
        </View>
        <View style={styles.list}>
          {activity.map((a) => (
            <ActivityRow key={a.id} activity={{ ...a, date: a.date }} />
          ))}
          {activity.length === 0 && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No recent activity yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 0 },
  heroBlock: { paddingHorizontal: 20, paddingTop: 16 },
  greeting: { fontFamily: "Inter_500Medium", fontSize: 13 },
  balance: { fontFamily: "Fraunces_700Bold", fontSize: 40, marginTop: 4 },
  balanceSub: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  quickRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  list: { paddingHorizontal: 20, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  rowValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingVertical: 24 },
});
