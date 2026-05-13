import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn } from "@/components/AuthGate";
import { getApiBaseUrl } from "@/lib/api";

interface ScanResult {
  identification?: { name?: string; category?: string; estimatedValue?: number };
  grading?: { centering: number; corners: number; edges: number; surface: number; overall: number };
  notes?: string;
}

export default function ScannerScreen() {
  const colors = useColors();
  const { getToken } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const pick = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Photo permission required.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!r.canceled && r.assets[0]) {
      setImageUri(r.assets[0].uri);
      setImageBase64(r.assets[0].base64 ?? null);
      setResult(null);
      setErr(null);
    }
  }, []);

  const camera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setErr("Camera permission required.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!r.canceled && r.assets[0]) {
      setImageUri(r.assets[0].uri);
      setImageBase64(r.assets[0].base64 ?? null);
      setResult(null);
      setErr(null);
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!imageBase64) {
      setErr("Pick or capture an image first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      const base = Platform.OS === "web" ? "" : (getApiBaseUrl() ?? "");
      const res = await fetch(`${base}/api/scanner/analyze`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || `Scanner failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [isSignedIn, imageBase64, getToken]);

  return (
    <PageShell title="Scanner">
      <View style={styles.body}>
        <Text style={[styles.h, { color: colors.foreground }]}>AI item identifier</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Snap or upload a photo and we'll identify the item, estimate value, and grade condition.
        </Text>

        <View style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <Feather name="camera" size={48} color={colors.mutedForeground} />
          )}
        </View>

        <View style={styles.btnRow}>
          <Pressable
            onPress={pick}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="image" size={16} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>Library</Text>
          </Pressable>
          <Pressable
            onPress={camera}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="camera" size={16} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>Camera</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={analyze}
          disabled={busy || !imageUri}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: colors.neonBlue,
              opacity: !imageUri || busy || pressed ? 0.6 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="zap" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Analyze
              </Text>
            </>
          )}
        </Pressable>

        {err && <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>}

        {result && (
          <View style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {result.identification?.name && (
              <Text style={[styles.resultName, { color: colors.foreground }]}>
                {result.identification.name}
              </Text>
            )}
            {result.identification?.category && (
              <Text style={[styles.resultCat, { color: colors.neonGreen }]}>
                {result.identification.category}
              </Text>
            )}
            {result.identification?.estimatedValue != null && (
              <Text style={[styles.resultValue, { color: colors.foreground }]}>
                Estimated ${result.identification.estimatedValue}
              </Text>
            )}
            {result.grading && (
              <View style={styles.gradeGrid}>
                {Object.entries(result.grading).map(([k, v]) => (
                  <View key={k} style={[styles.gradeCell, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                      {k}
                    </Text>
                    <Text style={{ color: colors.neonYellow, fontSize: 18, fontFamily: "Fraunces_700Bold" }}>
                      {String(v)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {result.notes && (
              <Text style={[styles.notes, { color: colors.mutedForeground }]}>{result.notes}</Text>
            )}
          </View>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 12 },
  h: { fontFamily: "Fraunces_700Bold", fontSize: 24 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 8 },
  frame: {
    height: 280,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  preview: { width: "100%", height: "100%" },
  btnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  err: { fontFamily: "Inter_500Medium", fontSize: 13 },
  result: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, gap: 4 },
  resultName: { fontFamily: "Fraunces_700Bold", fontSize: 20 },
  resultCat: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase" },
  resultValue: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 8 },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  gradeCell: { flexBasis: "30%", flexGrow: 1, padding: 10, borderRadius: 8, borderWidth: 1 },
  notes: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 12, lineHeight: 18 },
});
