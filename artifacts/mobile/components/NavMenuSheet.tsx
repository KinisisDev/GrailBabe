import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

type Href =
  | "/portfolio"
  | "/grail"
  | "/scanner"
  | "/trades"
  | "/my-trades"
  | "/messages"
  | "/billing"
  | "/settings"
  | "/security"
  | "/(tabs)"
  | "/(tabs)/vault"
  | "/(tabs)/community"
  | "/(tabs)/profile";

type Tint = "neonBlue" | "neonGreen" | "neonYellow" | "neonRed" | "neonAmber";

interface MenuItem {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: Href;
  tint: Tint;
  group: "primary" | "tools" | "account";
}

const ITEMS: MenuItem[] = [
  { label: "Home", icon: "home", href: "/(tabs)", tint: "neonBlue", group: "primary" },
  { label: "Vault", icon: "archive", href: "/(tabs)/vault", tint: "neonGreen", group: "primary" },
  { label: "Community", icon: "message-circle", href: "/(tabs)/community", tint: "neonYellow", group: "primary" },
  { label: "Profile", icon: "user", href: "/(tabs)/profile", tint: "neonAmber", group: "primary" },

  { label: "Scanner", icon: "camera", href: "/scanner", tint: "neonGreen", group: "tools" },
  { label: "Grail List", icon: "star", href: "/grail", tint: "neonYellow", group: "tools" },
  { label: "Trading Board", icon: "repeat", href: "/trades", tint: "neonAmber", group: "tools" },
  { label: "My Trades", icon: "git-branch", href: "/my-trades", tint: "neonAmber", group: "tools" },
  { label: "Messages", icon: "mail", href: "/messages", tint: "neonRed", group: "tools" },
  { label: "Portfolio", icon: "trending-up", href: "/portfolio", tint: "neonBlue", group: "tools" },

  { label: "Billing", icon: "credit-card", href: "/billing", tint: "neonGreen", group: "account" },
  { label: "Settings", icon: "settings", href: "/settings", tint: "neonBlue", group: "account" },
  { label: "Security", icon: "shield", href: "/security", tint: "neonYellow", group: "account" },
];

interface NavMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NavMenuSheet({ visible, onClose }: NavMenuSheetProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get("window");
  const sheetWidth = Math.min(Math.max(width * 0.82, 280), 360);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: visible ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slide, fade]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetWidth + 20, 0],
  });

  const handleNav = (href: Href) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onClose();
    setTimeout(() => router.push(href as never), 80);
  };

  const renderGroup = (title: string, group: MenuItem["group"]) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {ITEMS.filter((i) => i.group === group).map((item) => {
        const tint = colors[item.tint];
        return (
          <Pressable
            key={item.label}
            onPress={() => handleNav(item.href)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? colors.muted : "transparent",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${tint}22`, borderColor: `${tint}55` }]}>
              <Feather name={item.icon} size={18} color={tint} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            width: sheetWidth,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.card,
            borderLeftColor: colors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Menu</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: pressed ? colors.muted : "transparent" },
            ]}
          >
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {renderGroup("Navigate", "primary")}
          {renderGroup("Tools", "tools")}
          {renderGroup("Account", "account")}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  group: {
    marginTop: 14,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
