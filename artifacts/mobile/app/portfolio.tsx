import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import {
  useGetPortfolioSummary,
  useGetPortfolioByCategory,
  useGetPortfolioTimeline,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatCurrency, formatPercent, formatCompactCurrency } from "@/lib/format";

export default function PortfolioScreen() {
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const { data: summary, isLoading } = useGetPortfolioSummary(qopt(isSignedIn));
  const { data: byCat } = useGetPortfolioByCategory(qopt(isSignedIn));
  const { data: timeline } = useGetPortfolioTimeline(undefined, qopt(isSignedIn));

  if (!isSignedIn) {
    return (
      <PageShell title="Analytics">
        <SignInPrompt message="Sign in to see portfolio analytics, value over time, and category breakdowns." />
      </PageShell>
    );
  }

  if (isLoading || !summary) {
    return (
      <PageShell title="Analytics">
        <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 32 }} />
      </PageShell>
    );
  }

  const positive = summary.gain >= 0;
  const maxCat = Math.max(...(byCat ?? []).map((c) => c.value), 1);
  const tlPoints = (timeline ?? []) as Array<{ date: string; value: number }>;
  const tlMax = Math.max(...tlPoints.map((p) => p.value), 1);
  const tlMin = Math.min(...tlPoints.map((p) => p.value), 0);

  return (
    <PageShell title="Analytics">
      <View style={styles.heroBlock}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Total portfolio value</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {formatCurrency(summary.totalValue)}
        </Text>
        <Text style={[styles.delta, { color: positive ? colors.neonGreen : colors.neonRed }]}>
          {formatCurrency(summary.gain)} ({formatPercent(summary.gainPct)})
        </Text>
      </View>

      <View style={styles.statRow}>
        <Stat label="Cost basis" value={formatCompactCurrency(summary.totalCost)} />
        <Stat label="Items" value={String(summary.itemCount)} />
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>By category</Text>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {(byCat ?? []).map((c) => (
          <View
            key={c.category}
            style={[styles.barCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.barRow}>
              <Text style={[styles.cat, { color: colors.foreground }]}>{c.category}</Text>
              <Text style={[styles.catVal, { color: colors.neonGreen }]}>
                {formatCurrency(c.value)}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: colors.neonBlue, width: `${(c.value / maxCat) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.catSub, { color: colors.mutedForeground }]}>
              {c.itemCount} item{c.itemCount === 1 ? "" : "s"}
            </Text>
          </View>
        ))}
        {(byCat ?? []).length === 0 && (
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, padding: 16 }}>
            Add items to see category breakdown.
          </Text>
        )}
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Value over time</Text>
      <View style={[styles.timeline, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "flex-end", height: 120, paddingHorizontal: 12 }}>
          {tlPoints.map((p, i) => {
            const range = tlMax - tlMin || 1;
            const h = ((p.value - tlMin) / range) * 100 + 4;
            return (
              <View key={i} style={[styles.tlBar, { height: h, backgroundColor: colors.neonGreen }]} />
            );
          })}
          {tlPoints.length === 0 && (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, padding: 16 }}>
              Not enough history yet.
            </Text>
          )}
        </ScrollView>
      </View>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Fraunces_700Bold", fontSize: 22, color: colors.foreground, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBlock: { padding: 20 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12 },
  value: { fontFamily: "Fraunces_700Bold", fontSize: 36, marginTop: 4 },
  delta: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20 },
  stat: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1 },
  section: { fontFamily: "Fraunces_600SemiBold", fontSize: 18, paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  barCard: { padding: 12, borderRadius: 12, borderWidth: 1 },
  barRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cat: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  catVal: { fontFamily: "Inter_700Bold", fontSize: 13 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  catSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  timeline: {
    margin: 16,
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  tlBar: { width: 8, marginRight: 4, borderRadius: 2 },
});
