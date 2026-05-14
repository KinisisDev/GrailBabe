import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function useIsSignedIn(): { isSignedIn: boolean; isLoaded: boolean } {
  try {
    const { isSignedIn, isLoaded } = useAuth();
    return { isSignedIn: !!isSignedIn, isLoaded: !!isLoaded };
  } catch {
    return { isSignedIn: false, isLoaded: true };
  }
}

export function SignInPrompt({
  message = "Sign in to unlock this experience.",
}: {
  message?: string;
}) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Feather name="lock" size={18} color={colors.neonGreen} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          You're browsing as a guest
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {message}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/sign-in")}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.neonGreen, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.btnText, { color: "#0a0a0f" }]}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  body: { fontFamily: "Inter_400Regular", fontSize: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
