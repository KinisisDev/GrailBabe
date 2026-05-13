import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { IridescentHeader } from "@/components/IridescentHeader";

type Mode = "signIn" | "signUp" | "verify";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const onSignIn = useCallback(async () => {
    if (!signInLoaded || !signIn) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === "complete") {
        await setSignInActive({ session: res.createdSessionId });
        close();
      } else {
        setErr("Additional verification required.");
      }
    } catch (e) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Sign in failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }, [signInLoaded, signIn, email, password, setSignInActive, close]);

  const onSignUp = useCallback(async () => {
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    setErr(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setMode("verify");
    } catch (e) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Sign up failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }, [signUpLoaded, signUp, email, password]);

  const onVerify = useCallback(async () => {
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status === "complete") {
        await setSignUpActive({ session: res.createdSessionId });
        router.replace("/onboarding");
      } else {
        setErr("Verification incomplete.");
      }
    } catch (e) {
      const msg = (e as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Verification failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }, [signUpLoaded, signUp, code, setSignUpActive, router]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader
        title={mode === "signUp" ? "Create account" : mode === "verify" ? "Verify email" : "Sign in"}
        left={
          <Pressable onPress={close} hitSlop={12}>
            <Feather name="x" size={20} color="#0a0a0f" />
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.headline, { color: colors.foreground }]}>
            {mode === "verify" ? "Check your email" : "Welcome to GrailBabe"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {mode === "verify"
              ? `We sent a 6-digit code to ${email}.`
              : mode === "signUp"
                ? "Create an account to sync your collection."
                : "Sign in to your collector account."}
          </Text>

          {mode !== "verify" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput
                style={inputStyle}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
              <TextInput
                style={inputStyle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
              />
            </>
          )}

          {mode === "verify" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Verification code</Text>
              <TextInput
                style={inputStyle}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={colors.mutedForeground}
              />
            </>
          )}

          {err && (
            <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>
          )}

          <Pressable
            onPress={mode === "signIn" ? onSignIn : mode === "signUp" ? onSignUp : onVerify}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.neonBlue, opacity: pressed || busy ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : "Verify"}
              </Text>
            )}
          </Pressable>

          {mode !== "verify" && (
            <Pressable
              onPress={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setErr(null);
              }}
              style={styles.toggleBtn}
            >
              <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
                {mode === "signIn"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={{ color: colors.neonBlue }}>
                  {mode === "signIn" ? "Sign up" : "Sign in"}
                </Text>
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12 },
  headline: { fontFamily: "Fraunces_700Bold", fontSize: 28, marginTop: 12 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 16 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  toggleBtn: { paddingVertical: 16, alignItems: "center" },
  toggleText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
