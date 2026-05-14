import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line as SvgLine,
  Circle,
  Rect,
} from "react-native-svg";
import {
  useGetPortfolioSummary,
  useGetPortfolioByCategory,
  useGetPortfolioTimeline,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatCurrency, formatPercent, formatCompactCurrency } from "@/lib/format";

export default function PortfolioScreen() {
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const { data: apiSummary, isLoading } = useGetPortfolioSummary(qopt(isSignedIn));
  const { data: apiByCat } = useGetPortfolioByCategory(qopt(isSignedIn));
  const { data: apiTimeline } = useGetPortfolioTimeline(undefined, qopt(isSignedIn));

  const DEMO_SUMMARY = {
    totalValue: 74350,
    totalCost: 64980,
    gain: 9370,
    gainPct: 14.4,
    itemCount: 8,
  };
  const DEMO_BYCAT = [
    { category: "TCG", value: 38500, itemCount: 4 },
    { category: "LEGO", value: 18200, itemCount: 2 },
    { category: "Sports", value: 12450, itemCount: 1 },
    { category: "Other", value: 5200, itemCount: 1 },
  ];
  const DEMO_TIMELINE = Array.from({ length: 12 }).map((_, i) => ({
    date: new Date(2025, i, 1).toISOString(),
    value: 55000 + Math.round(Math.sin(i / 2) * 6000) + i * 1500,
  }));

  const summary = isSignedIn && apiSummary ? apiSummary : DEMO_SUMMARY;
  const byCat = isSignedIn && apiByCat ? apiByCat : DEMO_BYCAT;
  const timeline = isSignedIn && apiTimeline ? apiTimeline : DEMO_TIMELINE;

  if (isSignedIn && isLoading && !apiSummary) {
    return (
      <PageShell title="Analytics">
        <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 32 }} />
      </PageShell>
    );
  }

  const positive = summary.gain >= 0;
  const maxCat = Math.max(...byCat.map((c) => c.value), 1);
  const tlPoints = timeline as Array<{ date: string; value: number }>;
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
      <View
        style={[
          styles.timeline,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <TimelineChart points={tlPoints} min={tlMin} max={tlMax} />
      </View>
    </PageShell>
  );
}

function TimelineChart({
  points,
  min,
  max,
}: {
  points: Array<{ date: string; value: number }>;
  min: number;
  max: number;
}) {
  const colors = useColors();
  const [w, setW] = useState(0);
  const H = 160;
  const PAD_X = 14;
  const PAD_Y = 18;

  if (points.length === 0) {
    return (
      <View style={{ height: H, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
          }}
        >
          Not enough history yet.
        </Text>
      </View>
    );
  }

  const range = max - min || 1;
  const innerW = Math.max(0, w - PAD_X * 2);
  const innerH = H - PAD_Y * 2;

  const xy = points.map((p, i) => {
    const x =
      points.length === 1
        ? PAD_X + innerW / 2
        : PAD_X + (i / (points.length - 1)) * innerW;
    const y = PAD_Y + (1 - (p.value - min) / range) * innerH;
    return { x, y, value: p.value };
  });

  const linePath = xy
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
    .join(" ");
  const areaPath =
    xy.length > 0
      ? `${linePath} L ${xy[xy.length - 1].x} ${PAD_Y + innerH} L ${xy[0].x} ${PAD_Y + innerH} Z`
      : "";

  const last = xy[xy.length - 1];

  return (
    <View
      style={{ height: H }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="tlFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.neonGreen} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.neonGreen} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <SvgLine
              key={f}
              x1={PAD_X}
              x2={w - PAD_X}
              y1={PAD_Y + innerH * f}
              y2={PAD_Y + innerH * f}
              stroke={colors.border}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}
          {areaPath !== "" && <Path d={areaPath} fill="url(#tlFill)" />}
          <Path
            d={linePath}
            stroke={colors.neonGreen}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last && (
            <>
              <Circle
                cx={last.x}
                cy={last.y}
                r={6}
                fill={colors.neonGreen}
                fillOpacity={0.18}
              />
              <Circle cx={last.x} cy={last.y} r={3} fill={colors.neonGreen} />
            </>
          )}
          <Rect
            x={0}
            y={0}
            width={w}
            height={H}
            fill="transparent"
          />
        </Svg>
      )}
    </View>
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
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
});
