import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useGetMyProfile } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";

export default function SettingsScreen() {
  const colors = useColors();
  const { signOut } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const { data: me, isLoading } = useGetMyProfile(qopt(isSignedIn));

  return (
    <PageShell title="Settings">
      {!isSignedIn && <SignInPrompt />}
      {isLoading && <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 24 }} />}

      {isSignedIn && me && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Screenname" value={me.screenname ?? "—"} />
          <Row label="Display name" value={me.displayName} />
          <Row label="Email" value={me.email ?? "—"} />
          <Row label="Location" value={[me.city, me.region, me.country].filter(Boolean).join(", ") || "—"} />
          <Row label="Tier" value={me.tier} />
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle title="Preferences" />
        <Toggle label="Push notifications (iOS)" />
        <Toggle label="Price drop alerts" />
        <Toggle label="Trade messages" />
      </View>

      {isSignedIn && (
        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: colors.destructive, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </Pressable>
      )}
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontFamily: "Fraunces_600SemiBold", fontSize: 16, color: colors.foreground, paddingHorizontal: 16, marginBottom: 8 }}>
      {title}
    </Text>
  );
}

function Toggle({ label }: { label: string }) {
  const [on, setOn] = React.useState(false);
  const colors = useColors();
  return (
    <Pressable
      onPress={() => setOn((v) => !v)}
      style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground, flex: 1 }}>
        {label}
      </Text>
      <View
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          backgroundColor: on ? colors.neonGreen : colors.muted,
          padding: 2,
          alignItems: on ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: on ? "#0a0a0f" : colors.mutedForeground,
          }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, borderRadius: 14, borderWidth: 1 },
  row: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { marginTop: 8, paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
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
