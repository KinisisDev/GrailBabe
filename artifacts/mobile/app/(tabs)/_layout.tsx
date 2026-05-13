import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

import { useColors } from "@/hooks/useColors";

const isWeb = Platform.OS === "web";
const isIOS = Platform.OS === "ios";

// iOS 26 NativeTabs (liquid glass) and SF Symbols are iOS-only.
// We import them lazily inside the iOS render path so web/Android bundles
// don't pull them in (which crashes Metro's web bundle).
let NativeTabLayout: React.FC | null = null;
let SymbolView: React.ComponentType<{ name: string; tintColor: string; size: number }> | null = null;
let isLiquidGlassAvailable: () => boolean = () => false;

if (isIOS) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nativeTabsMod = require("expo-router/unstable-native-tabs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const symbolsMod = require("expo-symbols");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const glassMod = require("expo-glass-effect");
  SymbolView = symbolsMod.SymbolView;
  isLiquidGlassAvailable = glassMod.isLiquidGlassAvailable;
  const { Icon, Label, NativeTabs } = nativeTabsMod;
  NativeTabLayout = function NativeTabLayoutImpl() {
    return (
      <>
        <StatusBar style="light" />
        <NativeTabs>
          <NativeTabs.Trigger name="index">
            <Icon sf={{ default: "house", selected: "house.fill" }} />
            <Label>Home</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="vault">
            <Icon sf={{ default: "archivebox", selected: "archivebox.fill" }} />
            <Label>Vault</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="community">
            <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
            <Label>Community</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="profile">
            <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
            <Label>Profile</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </>
    );
  };
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.background,
            borderTopWidth: isWeb ? 1 : 0,
            borderTopColor: colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.background },
                ]}
              />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarActiveTintColor: colors.neonBlue,
            tabBarIcon: ({ color }) =>
              isIOS && SymbolView ? (
                <SymbolView name="house" tintColor={color} size={24} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: "Vault",
            tabBarActiveTintColor: colors.neonGreen,
            tabBarIcon: ({ color }) =>
              isIOS && SymbolView ? (
                <SymbolView name="archivebox" tintColor={color} size={24} />
              ) : (
                <Feather name="archive" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            tabBarActiveTintColor: colors.neonYellow,
            tabBarIcon: ({ color }) =>
              isIOS && SymbolView ? (
                <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={24} />
              ) : (
                <Feather name="message-square" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarActiveTintColor: colors.neonRed,
            tabBarIcon: ({ color }) =>
              isIOS && SymbolView ? (
                <SymbolView name="person.crop.circle" tintColor={color} size={24} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
    </>
  );
}

export default function TabLayout() {
  if (isIOS && NativeTabLayout && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
