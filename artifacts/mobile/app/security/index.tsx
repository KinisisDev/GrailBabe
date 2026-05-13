import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";

const SECTIONS: Array<{ label: string; sub: string; href: "/security/rules" | "/security/legal"; icon: keyof typeof Feather.glyphMap; tint: "neonBlue" | "neonGreen" | "neonYellow" }> = [
  { label: "Community Rules", sub: "How we keep the trading floor honest.", href: "/security/rules", icon: "shield", tint: "neonGreen" },
  { label: "Legal & Privacy", sub: "Terms, privacy, and dispute resolution.", href: "/security/legal", icon: "file-text", tint: "neonBlue" },
];

export default function SecurityHub() {
  const colors = useColors();
  const router = useRouter();
  return (
    <PageShell title="Security">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        GrailBabe is built for collectors, by collectors. Here's how we keep things safe.
      </Text>
      <View style={styles.list}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => router.push(s.href)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: colors.muted }]}>
              <Feather name={s.icon} size={18} color={colors[s.tint]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>
                {s.label}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                {s.sub}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: "Inter_400Regular", fontSize: 13, padding: 20, paddingBottom: 0 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderRadius: 14, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
