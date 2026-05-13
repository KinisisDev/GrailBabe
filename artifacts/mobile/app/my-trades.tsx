import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useListMyTrades } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatRelativeDate, formatCurrency } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  open: "#00d4ff",
  pending: "#fff200",
  completed: "#00ff88",
  cancelled: "#a3a3ac",
  closed: "#a3a3ac",
};

export default function MyTradesScreen() {
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const { data, isLoading } = useListMyTrades({ status: "all" }, qopt(isSignedIn));

  if (!isSignedIn) {
    return (
      <PageShell title="My Trades">
        <SignInPrompt message="Sign in to manage your trades and offers." />
      </PageShell>
    );
  }

  return (
    <PageShell title="My Trades">
      {isLoading && <ActivityIndicator color={colors.neonAmber} style={{ marginTop: 24 }} />}
      <View style={styles.list}>
        {(data ?? []).map((t) => (
          <View key={t.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                {t.title}
              </Text>
              <Text
                style={[
                  styles.status,
                  {
                    color: STATUS_COLORS[t.status] ?? colors.mutedForeground,
                    borderColor: STATUS_COLORS[t.status] ?? colors.border,
                  },
                ]}
              >
                {t.status}
              </Text>
            </View>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t.role} · {t.kind} · {formatRelativeDate(t.postedAt)}
            </Text>
            {t.askingPrice != null && (
              <Text style={[styles.price, { color: colors.neonYellow }]}>
                {formatCurrency(t.askingPrice)}
              </Text>
            )}
            {t.otherParty && (
              <Text style={[styles.party, { color: colors.mutedForeground }]}>
                with @{t.otherParty.screenname}
              </Text>
            )}
          </View>
        ))}
        {(data ?? []).length === 0 && !isLoading && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No trades yet. Browse the trading board to make offers.
          </Text>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 15, flex: 1 },
  status: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  meta: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 6, textTransform: "capitalize" },
  price: { fontFamily: "Fraunces_700Bold", fontSize: 16, marginTop: 6 },
  party: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
});
