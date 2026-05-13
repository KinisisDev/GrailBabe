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

// Sign-in prompts are disabled in test mode so QA can browse every screen
// without authenticating. Re-enable by restoring the previous JSX from git.
export function SignInPrompt(_: { message?: string }) {
  return null;
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
  body: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
