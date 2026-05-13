import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { DUMMY_ACTIVITY, DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { StatTile } from "@/components/StatTile";
import { ActivityRow } from "@/components/ActivityRow";
import { IridescentHeader } from "@/components/IridescentHeader";
import { SectionTitle } from "@/components/SectionTitle";

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const totalValue = DUMMY_VAULT_ITEMS.reduce((sum, item) => sum + item.currentValue, 0);
  const totalItems = DUMMY_VAULT_ITEMS.length;
  
  // top mover mock
  const topMover = DUMMY_VAULT_ITEMS.reduce((max, item) => {
    return item.changeAmount > max.changeAmount ? item : max;
  }, DUMMY_VAULT_ITEMS[0]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title="GrailBabe" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingBottom: Platform.OS === "web" ? 84 + 20 : insets.bottom + 100 
          }
        ]}
      >
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back,</Text>
        <Text style={[styles.balance, { color: colors.foreground }]}>
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.balanceSubtitle, { color: colors.neonGreen }]}>Portfolio Value</Text>

        <View style={styles.statsGrid}>
          <StatTile title="Vault Items" value={totalItems.toString()} />
          <StatTile 
            title="Top Mover" 
            value={`+${topMover?.changeAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
            subtitle={topMover?.name}
            highlight
          />
        </View>

        <SectionTitle>Recent Activity</SectionTitle>
        <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {DUMMY_ACTIVITY.map((activity, index) => (
            <ActivityRow 
              key={activity.id} 
              activity={activity} 
              isLast={index === DUMMY_ACTIVITY.length - 1}
            />
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 16,
    marginBottom: 4,
    fontFamily: "Inter_500Medium",
  },
  balance: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  balanceSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginBottom: 32,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
});
