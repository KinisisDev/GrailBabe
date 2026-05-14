import React from "react";
import { View, Text, StyleSheet, Linking, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";

const STANDARDS = [
  "Be respectful and constructive in all interactions",
  "Represent your items honestly and accurately",
  "Honor trade agreements you enter into",
  "Report suspicious activity or guideline violations",
  "Keep conversations relevant to collecting and the community",
];

const NOT_ALLOWED = [
  "Spam, self-promotion, or repetitive posts",
  "Harassment, hate speech, or personal attacks",
  "Off-topic content unrelated to collecting",
  "Sharing personal data or doxxing users",
  "Unsolicited direct messages or trade requests",
];

const PROHIBITED = [
  "Fake or exaggerated PSA/BGS grading claims",
  "Edited, filtered, or misleading card photos",
  "Listing items you do not own or possess",
  "Price manipulation and fake comparable listings",
  "Requesting off-platform payments (Venmo, Zelle, etc.)",
  "Creating multiple accounts after a ban",
];

const TIERS = [
  { tier: "Tier 1", body: "Warning + mandatory acknowledgment" },
  { tier: "Tier 2", body: "7-day suspension + listing removal" },
  { tier: "Tier 3", body: "30-day suspension + review required" },
  { tier: "Tier 4", body: "Permanent ban + account removal" },
];

export default function SecurityRules() {
  const colors = useColors();

  const Section = ({
    title,
    sub,
    items,
    icon,
    iconColor,
  }: {
    title: string;
    sub?: string;
    items: string[];
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
  }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.h2, { color: colors.foreground }]}>{title}</Text>
      {sub && (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
      )}
      <View style={{ marginTop: 10, gap: 8 }}>
        {items.map((s, i) => (
          <View key={i} style={styles.row}>
            <Feather name={icon} size={14} color={iconColor} style={{ marginTop: 3 }} />
            <Text style={[styles.itemText, { color: colors.foreground }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <PageShell title="Community Guidelines">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Effective May 2026
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16, marginHorizontal: 16 }]}>
        <Text style={[styles.h2, { color: colors.foreground }]}>Welcome to GrailBabe</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          GrailBabe is a community built for collectors of TCG, sports cards, and Lego. We're here to help
          you track, trade, and talk about the things you love. To keep this a safe and trusted space for
          everyone, all members are expected to follow these guidelines.
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 8 }]}>
          By using GrailBabe, you agree to these community standards. Violations may result in content
          removal, account suspension, or a permanent ban depending on severity.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 12 }}>
        <Section
          title="Community Standards"
          sub="We expect all members to:"
          items={STANDARDS}
          icon="check"
          iconColor={colors.neonGreen}
        />
        <Section
          title="Not Allowed"
          sub="May result in a warning or temporary restriction"
          items={NOT_ALLOWED}
          icon="x"
          iconColor={colors.neonYellow}
        />
        <Section
          title="Strictly Prohibited"
          sub="Results in suspension or permanent ban"
          items={PROHIBITED}
          icon="slash"
          iconColor={colors.destructive}
        />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.foreground }]}>Enforcement Tiers</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Applied based on violation severity and history
          </Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {TIERS.map((t) => (
              <View
                key={t.tier}
                style={[styles.tierRow, { borderColor: colors.border }]}
              >
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: colors.background, borderColor: colors.neonBlue },
                  ]}
                >
                  <Text style={[styles.tierBadgeText, { color: colors.neonBlue }]}>
                    {t.tier}
                  </Text>
                </View>
                <Text style={[styles.tierBody, { color: colors.foreground }]}>{t.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => Linking.openURL("mailto:support@grailbabe.com")}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 }]}
        >
          <Feather name="mail" size={16} color={colors.mutedForeground} />
          <Text style={[styles.body, { color: colors.foreground, flex: 1 }]}>
            <Text style={{ fontFamily: "Inter_700Bold" }}>Appeals: </Text>
            support@grailbabe.com within 14 days of action.
          </Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          This platform is not affiliated with, endorsed by, or sponsored by The Pokémon Company,
          Nintendo, Game Freak, or Creatures Inc. Pokémon and related properties are trademarks of
          their respective owners.
        </Text>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: "Inter_500Medium", fontSize: 12, paddingHorizontal: 20, paddingTop: 8 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1 },
  h2: { fontFamily: "Fraunces_600SemiBold", fontSize: 18 },
  sub: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  itemText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tierBadgeText: { fontFamily: "Fraunces_600SemiBold", fontSize: 12 },
  tierBody: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 8, paddingBottom: 24 },
});
