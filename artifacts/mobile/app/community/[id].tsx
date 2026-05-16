import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth/entraAuthContext";
import { Feather } from "@expo/vector-icons";
import {
  useGetCommunityPost,
  useListCommunityComments,
  getListCommunityCommentsQueryKey,
  getGetCommunityPostQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { getApiBaseUrl, qopt } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";

export default function CommunityPostScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { isSignedIn } = useIsSignedIn();
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const { data: post, isLoading } = useGetCommunityPost(postId, qopt(!Number.isNaN(postId)));
  const { data: comments } = useListCommunityComments(postId, qopt(!Number.isNaN(postId)));

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const callApi = useCallback(
    async (path: string, init: RequestInit) => {
      const token = await getToken();
      const base = Platform.OS === "web" ? "" : (getApiBaseUrl() ?? "");
      return fetch(`${base}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(init.headers ?? {}),
        },
      });
    },
    [getToken],
  );

  const vote = useCallback(
    async (value: 1 | -1) => {
      if (!isSignedIn) return;
      setActionError(null);
      try {
        const res = await callApi(`/api/community/posts/${postId}/vote`, {
          method: "POST",
          body: JSON.stringify({ value }),
        });
        if (!res.ok) throw new Error(`Vote failed (${res.status})`);
        qc.invalidateQueries({ queryKey: getGetCommunityPostQueryKey(postId) });
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Vote failed");
      }
    },
    [callApi, postId, isSignedIn, qc],
  );

  const comment = useCallback(async () => {
    if (!draft.trim() || !isSignedIn || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await callApi(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) throw new Error(`Comment failed (${res.status})`);
      setDraft("");
      qc.invalidateQueries({ queryKey: getListCommunityCommentsQueryKey(postId) });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setBusy(false);
    }
  }, [callApi, draft, isSignedIn, busy, postId, qc]);

  if (isLoading || !post) {
    return (
      <PageShell title="Post">
        <ActivityIndicator color={colors.neonYellow} style={{ marginTop: 32 }} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Post" scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cat, { color: colors.neonYellow, borderColor: colors.neonYellow }]}>
              {post.category}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              @{post.authorName} · {formatRelativeDate(post.createdAt)}
            </Text>
            <Text style={[styles.body, { color: colors.foreground }]}>{post.body}</Text>

            <View style={styles.voteRow}>
              <Pressable onPress={() => vote(1)} hitSlop={12}>
                <Feather name="arrow-up" size={20} color={colors.neonGreen} />
              </Pressable>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>
                {post.score}
              </Text>
              <Pressable onPress={() => vote(-1)} hitSlop={12}>
                <Feather name="arrow-down" size={20} color={colors.neonRed} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Feather name="message-circle" size={16} color={colors.mutedForeground} />
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground }}>
                {post.commentCount}
              </Text>
            </View>
          </View>

          <Text style={[styles.section, { color: colors.foreground }]}>Comments</Text>
          {(comments ?? []).map((c) => (
            <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.commentMeta, { color: colors.mutedForeground }]}>
                @{c.authorName} · {formatRelativeDate(c.createdAt)}
              </Text>
              <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.body}</Text>
            </View>
          ))}
          {(comments ?? []).length === 0 && (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, padding: 16 }}>
              No comments yet — be the first.
            </Text>
          )}
        </ScrollView>

        {actionError && (
          <Text style={{ color: colors.neonRed, fontFamily: "Inter_500Medium", fontSize: 12, paddingHorizontal: 16, paddingVertical: 6 }}>
            {actionError}
          </Text>
        )}
        {isSignedIn ? (
          <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              multiline
            />
            <Pressable
              onPress={comment}
              disabled={busy || !draft.trim()}
              style={[styles.sendBtn, { backgroundColor: colors.neonYellow, opacity: !draft.trim() ? 0.5 : 1 }]}
            >
              <Feather name="send" size={16} color="#0a0a0f" />
            </Pressable>
          </View>
        ) : (
          <SignInPrompt message="Sign in to vote and comment." />
        )}
      </KeyboardAvoidingView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  cat: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  title: { fontFamily: "Fraunces_700Bold", fontSize: 22, marginTop: 8 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 12, lineHeight: 20 },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  section: { fontFamily: "Fraunces_600SemiBold", fontSize: 18, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
  commentCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  commentMeta: { fontFamily: "Inter_500Medium", fontSize: 11 },
  commentBody: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
