import React, { ReactNode } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { iridescentGradient } from "@/constants/colors";

interface IridescentHeaderProps {
  title: string;
  right?: ReactNode;
  left?: ReactNode;
}

export function IridescentHeader({ title, right, left }: IridescentHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  
  return (
    <LinearGradient
      colors={iridescentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, { paddingTop: topInset }]}
    >
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {left}
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightContainer}>
          {right}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    zIndex: 10,
    elevation: 10,
  },
  content: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#0a0a0f",
    letterSpacing: -0.5,
    textShadowColor: "rgba(255, 255, 255, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  leftContainer: {
    position: "absolute",
    left: 16,
    height: "100%",
    justifyContent: "center",
  },
  rightContainer: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
});
