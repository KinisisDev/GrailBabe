import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <View style={[styles.content, { paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 90 }]}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="user" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestText, { color: colors.foreground }]}>Guest Collector</Text>
          <Text style={[styles.subText, { color: colors.mutedForeground }]}>Sync your vault across devices</Text>
          
          <Pressable 
            style={({ pressed }) => [
              styles.ctaButton, 
              { 
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign In to Sync</Text>
          </Pressable>
        </View>

        <View style={styles.settingsGroup}>
          <Pressable style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Feather name="settings" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground }]}>App Settings</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </Pressable>
          <Pressable style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Feather name="bell" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground }]}>Notifications</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </Pressable>
          <Pressable style={styles.settingRow}>
            <Feather name="help-circle" size={20} color={colors.foreground} />
            <Text style={[styles.settingText, { color: colors.foreground }]}>Support</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </Pressable>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>GrailBabe v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  content: {
    paddingHorizontal: 20,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  settingsGroup: {
    marginBottom: 32,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});