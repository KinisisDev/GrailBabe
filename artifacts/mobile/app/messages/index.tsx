import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListConversations } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { qopt } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";

export default function MessagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();
  const { data, isLoading } = useListConversations(qopt(isSignedIn));

  if (!isSignedIn) {
    return (
      <PageShell title="Messages">
        <SignInPrompt message="Sign in to message other collectors." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Messages">
      {isLoading && <ActivityIndicator color={colors.neonRed} style={{ marginTop: 24 }} />}
      <View style={styles.list}>
        {(data ?? []).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: "/messages/[id]", params: { id: String(c.id) } })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={18} color={colors.neonRed} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.headRow}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {c.otherUser.displayName}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {formatRelativeDate(c.updatedAt)}
                </Text>
              </View>
              <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
                {c.lastMessage?.content ?? "Start the conversation"}
              </Text>
            </View>
            {c.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.neonRed }]}>
                <Text style={styles.badgeText}>{c.unreadCount}</Text>
              </View>
            )}
          </Pressable>
        ))}
        {(data ?? []).length === 0 && !isLoading && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No conversations yet.
          </Text>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  time: { fontFamily: "Inter_400Regular", fontSize: 11, marginLeft: 8 },
  preview: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#0a0a0f", fontFamily: "Inter_700Bold", fontSize: 11 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
});
