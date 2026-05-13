import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";

const RULES = [
  { title: "Be honest about condition", body: "Photos must reflect the real item. Misrepresentation may permanently restrict your account." },
  { title: "Ship within 5 business days", body: "Use a tracked service. Provide tracking in the conversation thread." },
  { title: "No off-platform escapes", body: "Keep negotiations and payment confirmations inside GrailBabe so we can mediate disputes." },
  { title: "Report bad actors", body: "Use the report button on profiles, posts, and trade threads. We take action quickly." },
  { title: "Respect grading authorities", body: "Don't claim PSA/BGS grades you can't prove. Cert numbers are verifiable." },
];

export default function SecurityRules() {
  const colors = useColors();
  return (
    <PageShell title="Community Rules">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        These rules keep the trading floor honest and the community welcoming.
      </Text>
      <View style={styles.list}>
        {RULES.map((r, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.num, { color: colors.neonGreen }]}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{r.title}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{r.body}</Text>
          </View>
        ))}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: "Inter_400Regular", fontSize: 13, padding: 20, paddingBottom: 0 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  num: { fontFamily: "Fraunces_700Bold", fontSize: 14, marginBottom: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 15 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 },
});
