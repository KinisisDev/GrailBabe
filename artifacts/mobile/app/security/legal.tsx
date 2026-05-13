import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";

const SECTIONS = [
  { title: "Terms of Service", body: "By using GrailBabe you agree to our terms covering account use, payments, content, and dispute resolution." },
  { title: "Privacy Policy", body: "We collect the minimum data needed to operate the platform. Your collection details are private by default." },
  { title: "Trade Mediation", body: "We provide structured trade conversations and ratings to reduce risk. We do not act as escrow on physical goods." },
  { title: "Subscription & Refunds", body: "Premium subscriptions auto-renew. Cancel anytime in the Stripe portal — your tier remains active until period end." },
];

export default function SecurityLegal() {
  const colors = useColors();
  return (
    <PageShell title="Legal & Privacy">
      <View style={styles.list}>
        {SECTIONS.map((s, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{s.body}</Text>
          </View>
        ))}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 16 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6, lineHeight: 18 },
});
