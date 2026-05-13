import React from "react";
import { View, Text, StyleSheet, Platform, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetMe } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { IridescentHeader } from "@/components/IridescentHeader";
import { useIsSignedIn } from "@/components/AuthGate";
import { qopt } from "@/lib/api";

const MENU: Array<{
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href:
    | "/portfolio"
    | "/grail"
    | "/scanner"
    | "/trades"
    | "/my-trades"
    | "/messages"
    | "/billing"
    | "/settings"
    | "/security";
  tint: "neonBlue" | "neonGreen" | "neonYellow" | "neonRed" | "neonAmber";
}> = [
  { label: "My Analytics", icon: "trending-up", href: "/portfolio", tint: "neonBlue" },
  { label: "Grail List", icon: "star", href: "/grail", tint: "neonYellow" },
  { label: "Scanner", icon: "camera", href: "/scanner", tint: "neonGreen" },
  { label: "Trading Board", icon: "repeat", href: "/trades", tint: "neonAmber" },
  { label: "My Trades", icon: "git-branch", href: "/my-trades", tint: "neonAmber" },
  { label: "Messages", icon: "mail", href: "/messages", tint: "neonRed" },
  { label: "Billing", icon: "credit-card", href: "/billing", tint: "neonGreen" },
  { label: "Settings", icon: "settings", href: "/settings", tint: "neonBlue" },
  { label: "Security", icon: "shield", href: "/security", tint: "neonYellow" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { signOut, isLoaded } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const { data: me } = useGetMe(qopt(isSignedIn));

  const displayName = me?.profile.displayName ?? "Guest Collector";
  const tier = me?.subscription.tier ?? "free";
  const vaultCount = me?.profile.vaultCount ?? 0;
  const grailCount = me?.profile.grailCount ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="Profile" />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100,
        }}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.muted, borderColor: colors.neonBlue }]}>
            <Feather name="user" size={32} color={colors.neonBlue} />
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          <View style={styles.tierBadge}>
            <Text
              style={[
                styles.tierText,
                {
                  color: tier === "premium" ? colors.neonYellow : colors.mutedForeground,
                  borderColor: tier === "premium" ? colors.neonYellow : colors.border,
                },
              ]}
            >
              {tier === "premium" ? "★ Premium" : "Free tier"}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatBlock label="Vault" value={String(vaultCount)} tint={colors.neonGreen} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatBlock label="Grail" value={String(grailCount)} tint={colors.neonYellow} />
          </View>

          {!isSignedIn && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                router.push("/sign-in");
              }}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: colors.neonBlue, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign in to sync</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.menu}>
          {MENU.map((m) => (
            <Pressable
              key={m.label}
              onPress={() => router.push(m.href)}
              style={({ pressed }) => [
                styles.menuRow,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Feather name={m.icon} size={16} color={colors[m.tint]} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{m.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        {isSignedIn && (
          <Pressable
            onPress={() => signOut()}
            disabled={!isLoaded}
            style={({ pressed }) => [
              styles.signOut,
              { borderColor: colors.destructive, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
        )}
        {!isLoaded && (
          <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 16 }} />
        )}
      </ScrollView>
    </View>
  );
}

function StatBlock({ label, value, tint }: { label: string; value: string; tint: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontFamily: "Fraunces_700Bold", fontSize: 22, color: tint }}>{value}</Text>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: { fontFamily: "Fraunces_700Bold", fontSize: 22 },
  tierBadge: { marginTop: 6 },
  tierText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 18,
  },
  divider: { width: 1, height: 30 },
  cta: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  menu: { paddingHorizontal: 16, gap: 8 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  signOut: {
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
