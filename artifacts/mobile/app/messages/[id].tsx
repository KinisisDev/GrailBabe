import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useListMessages } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMessagesQueryKey } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { getApiBaseUrl, qopt } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";

export default function ConversationScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const { getToken, userId } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data, isLoading } = useListMessages(
    conversationId,
    qopt(isSignedIn && !Number.isNaN(conversationId), { refetchInterval: 5000 }),
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const token = await getToken();
      const base = Platform.OS === "web" ? "" : (getApiBaseUrl() ?? "");
      const res = await fetch(`${base}/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error(`Send failed (${res.status})`);
      setDraft("");
      qc.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }, [draft, sending, conversationId, getToken, qc]);

  if (!isSignedIn) {
    return (
      <PageShell title="Conversation">
        <SignInPrompt />
      </PageShell>
    );
  }

  return (
    <PageShell title="Conversation" scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && <ActivityIndicator color={colors.neonRed} />}
          {(data ?? []).map((m) => {
            const mine = m.senderId === userId;
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  {
                    alignSelf: mine ? "flex-end" : "flex-start",
                    backgroundColor: mine ? colors.neonBlue : colors.card,
                    borderColor: mine ? colors.neonBlue : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: mine ? "#0a0a0f" : colors.foreground,
                  }}
                >
                  {m.content}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 10,
                    marginTop: 4,
                    color: mine ? "rgba(10,10,15,0.6)" : colors.mutedForeground,
                  }}
                >
                  {formatRelativeDate(m.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        {sendError && (
          <Text style={{ color: colors.neonRed, fontFamily: "Inter_500Medium", fontSize: 12, paddingHorizontal: 16, paddingVertical: 6 }}>
            {sendError}
          </Text>
        )}
        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={sending || !draft.trim()}
            style={[styles.sendBtn, { backgroundColor: colors.neonBlue, opacity: !draft.trim() ? 0.5 : 1 }]}
          >
            <Feather name="send" size={16} color="#0a0a0f" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 14, borderWidth: 1 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
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
