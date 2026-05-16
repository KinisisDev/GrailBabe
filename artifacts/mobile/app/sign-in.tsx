import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { IridescentHeader } from "@/components/IridescentHeader";
import { useAuth } from "@/lib/auth/entraAuthContext";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, isSignedIn } = useAuth();

  const [busy, setBusy] = useState<"signIn" | "signUp" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  React.useEffect(() => {
    if (isSignedIn) close();
  }, [isSignedIn, close]);

  const onSignIn = useCallback(async () => {
    setBusy("signIn");
    setErr(null);
    try {
      await signIn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(null);
    }
  }, [signIn]);

  const onSignUp = useCallback(async () => {
    setBusy("signUp");
    setErr(null);
    try {
      await signIn({ prompt: "create" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(null);
    }
  }, [signIn]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader
        title="Sign in"
        left={
          <Pressable onPress={close} hitSlop={12}>
            <Feather name="x" size={20} color="#0a0a0f" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.headline, { color: colors.foreground }]}>
          Welcome to GrailBabe
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Sign in to sync your collection, message traders, and track your grails.
        </Text>

        {err && (
          <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>
        )}

        <Pressable
          onPress={onSignIn}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: colors.neonBlue,
              opacity: pressed || busy !== null ? 0.85 : 1,
            },
          ]}
        >
          {busy === "signIn" ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              Sign in
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onSignUp}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity: pressed || busy !== null ? 0.85 : 1,
            },
          ]}
        >
          {busy === "signUp" ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              Create account
            </Text>
          )}
        </Pressable>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          A secure sign-in window will open. Use email, Google, or Apple if your
          tenant supports it.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12 },
  headline: { fontFamily: "Fraunces_700Bold", fontSize: 28, marginTop: 12 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 16 },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  footnote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
});
