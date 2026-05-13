import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SectionTitleProps {
  children: string;
  style?: TextStyle;
}

export function SectionTitle({ children, style }: SectionTitleProps) {
  const colors = useColors();

  return (
    <Text style={[styles.title, { color: colors.foreground }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
});
