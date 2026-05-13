import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListCommunityPosts } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { DUMMY_POSTS } from "@/constants/demoData";
import { IridescentHeader } from "@/components/IridescentHeader";
import { useIsSignedIn } from "@/components/AuthGate";
import { formatRelativeDate } from "@/lib/format";

const CATEGORIES = ["all", "tcg", "lego", "sports", "general"] as const;

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");

  const { data: posts, isLoading } = useListCommunityPosts(
    cat === "all" ? { sort: "new" } : { category: cat, sort: "new" },
  );

  const list = isSignedIn || (posts && posts.length > 0)
    ? (posts ?? []).map((p) => ({
        id: String(p.id),
        author: p.authorName,
        category: p.category,
        title: p.title,
        body: p.body,
        score: p.score,
        comments: p.commentCount,
        date: p.createdAt,
      }))
    : DUMMY_POSTS.map((p) => ({
        id: p.id,
        author: p.authorName,
        category: p.tags[0] ?? "general",
        title: p.content.slice(0, 60),
        body: p.content,
        score: p.likes,
        comments: p.comments,
        date: p.date,
      }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="Community" />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 100,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((c) => {
            const active = c === cat;
            return (
              <Pressable
                key={c}
                onPress={() => setCat(c)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.neonYellow : colors.card,
                    borderColor: active ? colors.neonYellow : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#0a0a0f" : colors.mutedForeground },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading && (
          <ActivityIndicator color={colors.neonYellow} style={{ marginTop: 24 }} />
        )}

        <View style={styles.list}>
          {list.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: "/community/[id]", params: { id: p.id } })}
              style={({ pressed }) => [
                styles.post,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.metaRow}>
                <Text style={[styles.cat, { color: colors.neonYellow, borderColor: colors.neonYellow }]}>
                  {p.category}
                </Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {formatRelativeDate(p.date)} · @{p.author}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                {p.title}
              </Text>
              {p.body !== p.title && (
                <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {p.body}
                </Text>
              )}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Feather name="arrow-up" size={14} color={colors.neonGreen} />
                  <Text style={[styles.statText, { color: colors.neonGreen }]}>{p.score}</Text>
                </View>
                <View style={styles.stat}>
                  <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.statText, { color: colors.mutedForeground }]}>{p.comments}</Text>
                </View>
              </View>
            </Pressable>
          ))}
          {list.length === 0 && !isLoading && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No posts in this category yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize" },
  list: { paddingHorizontal: 16, gap: 10 },
  post: { padding: 14, borderRadius: 14, borderWidth: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cat: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: "uppercase",
  },
  date: { fontFamily: "Inter_400Regular", fontSize: 11 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 16, marginTop: 2 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
});
