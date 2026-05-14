import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export function TrademarkFooter() {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        © {new Date().getFullYear()} KinisisLabs LLC. KinisisLabs LLC does not own or claim any
        copyright, trademark, or other intellectual-property rights in any trading card games
        (TCG), LEGO products, or sports-related properties referenced on this platform. All product
        names, logos, brands, characters, and related marks are the property of their respective
        owners. Use of these names, logos, and brands does not imply endorsement or affiliation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
});
