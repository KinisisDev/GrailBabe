import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useListGrails } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const PRIORITY_COLOR = {
  high: "#ff2e63",
  medium: "#fff200",
  low: "#00d4ff",
} as const;

const DEMO_GRAILS = [
  { id: 1, name: "1st Edition Holographic Charizard", category: "TCG", targetPrice: 25000, priority: "high" as const },
  { id: 2, name: "LEGO UCS Death Star (10188)", category: "LEGO", targetPrice: 1200, priority: "medium" as const },
  { id: 3, name: "BGS 9.5 Mickey Mantle 1952", category: "Sports", targetPrice: 100000, priority: "high" as const },
];

export default function GrailScreen() {
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const { data, isLoading } = useListGrails(qopt(isSignedIn));

  const list = isSignedIn && data ? data : DEMO_GRAILS;

  return (
    <PageShell title="Grail List">
      {!isSignedIn && <SignInPrompt message="Sign in to track your real grails." />}
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        The pieces you're chasing — set targets, get notified on price drops.
      </Text>
      {isLoading && isSignedIn && <ActivityIndicator color={colors.neonYellow} style={{ marginTop: 24 }} />}
      <View style={styles.list}>
        {list.map((g) => (
          <View
            key={g.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View
              style={[
                styles.priority,
                { backgroundColor: PRIORITY_COLOR[g.priority] ?? colors.neonBlue },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cat, { color: colors.neonYellow }]}>{g.category}</Text>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
                {g.name}
              </Text>
              {g.targetPrice != null && (
                <Text style={[styles.price, { color: colors.mutedForeground }]}>
                  Target {formatCurrency(g.targetPrice)}
                </Text>
              )}
            </View>
            <Feather name="star" size={18} color={colors.neonYellow} />
          </View>
        ))}
        {list.length === 0 && !isLoading && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No grails yet — add the holy pieces you want to chase.
          </Text>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: "Inter_400Regular", fontSize: 13, paddingHorizontal: 20, marginTop: 16 },
  list: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  priority: { width: 4, height: 40, borderRadius: 2 },
  cat: { fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontFamily: "Fraunces_600SemiBold", fontSize: 15, marginTop: 2 },
  price: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
});
