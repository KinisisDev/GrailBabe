import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ActivityEvent } from "@/constants/demoData";
import { Feather } from "@expo/vector-icons";

interface ActivityRowProps {
  activity: ActivityEvent;
  isLast?: boolean;
}

export function ActivityRow({ activity, isLast = false }: ActivityRowProps) {
  const colors = useColors();

  const getIcon = () => {
    switch (activity.type) {
      case "addition":
        return <Feather name="plus-circle" size={20} color={colors.primary} />;
      case "price_update":
        return <Feather name="trending-up" size={20} color={colors.accent} />;
      case "grading":
        return <Feather name="award" size={20} color={colors.primary} />;
      default:
        return <Feather name="activity" size={20} color={colors.foreground} />;
    }
  };

  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
        {getIcon()}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{activity.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {activity.subtitle}
        </Text>
      </View>
      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {new Date(activity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});