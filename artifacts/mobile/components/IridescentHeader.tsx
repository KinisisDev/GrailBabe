import React, { ReactNode, useState } from "react";
import { View, Text, Image, StyleSheet, Platform, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { iridescentGradient } from "@/constants/colors";
import { NavMenuSheet } from "@/components/NavMenuSheet";

const LOGO = require("../assets/images/grailbabe-logo.png");

interface IridescentHeaderProps {
  title: string;
  right?: ReactNode;
  left?: ReactNode;
  logo?: boolean;
  hideMenu?: boolean;
}

export function IridescentHeader({ title, right, left, logo, hideMenu }: IridescentHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setMenuOpen(true);
  };

  return (
    <>
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
          {logo ? (
            <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel={title} />
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
          <View style={styles.rightContainer}>
            {right}
            {!hideMenu && (
              <Pressable
                onPress={openMenu}
                hitSlop={12}
                accessibilityLabel="Open menu"
                style={({ pressed }) => [
                  styles.menuBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Feather name="menu" size={22} color="#0a0a0f" />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
      <NavMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    zIndex: 10,
    elevation: 10,
  },
  content: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
    overflow: "visible",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  logo: {
    height: 160,
    width: 410,
  },
});
