import React, { ReactNode } from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { IridescentHeader } from "@/components/IridescentHeader";
import { TrademarkFooter } from "@/components/TrademarkFooter";
import { useColors } from "@/hooks/useColors";

interface PageShellProps {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  bottomInset?: boolean;
}

export function PageShell({
  title,
  children,
  right,
  scroll = true,
  onRefresh,
  refreshing,
  bottomInset = true,
}: PageShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const pad = bottomInset ? (Platform.OS === "web" ? 100 : insets.bottom + 100) : 24;

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      hitSlop={12}
    >
      <Feather name="chevron-left" size={22} color="#0a0a0f" />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IridescentHeader title={title} left={back} right={right} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: pad }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.neonBlue}
              />
            ) : undefined
          }
        >
          {children}
          <TrademarkFooter />
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: pad }}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
