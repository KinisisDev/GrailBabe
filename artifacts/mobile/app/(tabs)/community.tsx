import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { DUMMY_POSTS } from "@/constants/demoData";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { IridescentHeader } from "@/components/IridescentHeader";

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="Community" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : insets.bottom + 100 }
        ]}
      >
        {DUMMY_POSTS.map(post => (
          <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarText, { color: colors.foreground }]}>
                  {post.authorName.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={[styles.authorName, { color: colors.foreground }]}>{post.authorName}</Text>
                <Text style={[styles.authorHandle, { color: colors.mutedForeground }]}>{post.authorHandle}</Text>
              </View>
            </View>
            
            <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>
            
            <View style={styles.tagsRow}>
              {post.tags.map(tag => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
              <Pressable 
                style={styles.actionButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Feather name="heart" size={18} color={colors.mutedForeground} />
                <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.likes}</Text>
              </Pressable>
              <Pressable 
                style={styles.actionButton}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Feather name="message-circle" size={18} color={colors.mutedForeground} />
                <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.comments}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
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
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: "Fraunces_700Bold",
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  authorName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  authorHandle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  postContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
