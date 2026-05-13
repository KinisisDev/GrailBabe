import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline } from "react-native-svg";
import {
  useScannerAnalyze,
  useRemoveBackground,
  type ScannerAnalyzeResult,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";

type Mode = "standard" | "advanced";
type Category = "tcg" | "sports" | "lego";

const MAX_PHOTOS = 6;

function ScanOverlay() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // Thumb is 110 tall; bar is 2px. Move from 0 to 108.
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 108],
  });

  return (
    <View pointerEvents="none" style={scanStyles.overlay}>
      <View style={scanStyles.tint} />
      <Animated.View
        style={[
          scanStyles.bar,
          { transform: [{ translateY }] },
        ]}
      />
      <View style={scanStyles.frame} />
    </View>
  );
}

const scanStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 8,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,255,136,0.10)",
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: "#b6ffd9",
    shadowColor: "#00ff88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.55)",
    borderRadius: 8,
  },
});

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function ScannerScreen() {
  const colors = useColors();

  const [mode, setMode] = useState<Mode>("standard");
  const [category, setCategory] = useState<Category>("tcg");
  const [itemId, setItemId] = useState("");
  const [images, setImages] = useState<string[]>([]); // data URLs
  const [bgRemoving, setBgRemoving] = useState(false);
  const [result, setResult] = useState<ScannerAnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ai: true,
    market: true,
    ladder: false,
    history: false,
  });

  const analyzeMut = useScannerAnalyze();
  const removeBgMut = useRemoveBackground();

  const addImage = useCallback(
    async (base64: string, mime: string) => {
      let dataUrl = `data:${mime};base64,${base64}`;
      if (category === "tcg" || category === "sports") {
        setBgRemoving(true);
        try {
          const r = await removeBgMut.mutateAsync({
            data: { imageBase64: dataUrl },
          });
          dataUrl = r.imageBase64;
        } catch {
          // silent fallback
        } finally {
          setBgRemoving(false);
        }
      }
      setImages((prev) => [...prev, dataUrl]);
    },
    [category, removeBgMut],
  );

  const pick = useCallback(async () => {
    if (images.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAnalyzeError("Photo permission required.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      await addImage(r.assets[0].base64, r.assets[0].mimeType ?? "image/jpeg");
    }
  }, [images.length, addImage]);

  const camera = useCallback(async () => {
    if (images.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setAnalyzeError("Camera permission required.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!r.canceled && r.assets[0]?.base64) {
      await addImage(r.assets[0].base64, r.assets[0].mimeType ?? "image/jpeg");
    }
  }, [images.length, addImage]);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const runAnalyze = useCallback(async () => {
    if (!itemId.trim()) {
      setAnalyzeError("Enter an item name or set number first.");
      return;
    }
    setAnalyzeError(null);
    setResult(null);
    setAiBannerDismissed(false);
    try {
      const useImages = mode === "advanced" ? images : [];
      const res = await analyzeMut.mutateAsync({
        data: {
          itemId: itemId.trim(),
          category,
          mode,
          imageBase64: useImages[0] ?? null,
          imageBase64s: useImages.length > 1 ? useImages.slice(1) : null,
        },
      });
      setResult(res);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
    }
  }, [itemId, mode, category, images, analyzeMut]);

  const reset = useCallback(() => {
    setResult(null);
    setImages([]);
    setItemId("");
    setAnalyzeError(null);
  }, []);

  const toggleSection = useCallback((k: string) => {
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));
  }, []);

  const primaryImage = images[0] ?? null;
  const isPending = analyzeMut.isPending;

  return (
    <PageShell title="Scanner">
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h, { color: colors.foreground }]}>
              <Feather name="zap" size={20} color={colors.neonBlue} /> Scanner
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Identify items, fetch market prices, and grade with AI.
            </Text>
          </View>
        </View>

        <ModeToggle mode={mode} onChange={setMode} colors={colors} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Category */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <View style={[styles.segment, { borderColor: colors.border }]}>
            {(
              [
                { v: "tcg", label: "TCG" },
                { v: "sports", label: "Sports" },
                { v: "lego", label: "LEGO" },
              ] as { v: Category; label: string }[]
            ).map((c) => {
              const active = category === c.v;
              return (
                <Pressable
                  key={c.v}
                  onPress={() => setCategory(c.v)}
                  style={({ pressed }) => [
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? colors.primary : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.mutedForeground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Item ID */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            {category === "lego" ? "Set number or name" : "Card name"}
          </Text>
          <TextInput
            value={itemId}
            onChangeText={setItemId}
            placeholder={
              category === "lego"
                ? "e.g. 10300 or Time Machine"
                : category === "tcg"
                  ? "e.g. Charizard or Black Lotus"
                  : "e.g. 1986 Topps Jordan #57"
            }
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            returnKeyType="search"
            onSubmitEditing={runAnalyze}
          />

          {/* Photos */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            Photos ({images.length}/{MAX_PHOTOS}) — front, back, corners help
          </Text>
          <View style={styles.btnRow}>
            <Pressable
              onPress={camera}
              disabled={images.length >= MAX_PHOTOS}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  opacity: pressed || images.length >= MAX_PHOTOS ? 0.6 : 1,
                },
              ]}
            >
              <Feather name="camera" size={14} color={colors.foreground} />
              <Text style={[styles.btnText, { color: colors.foreground }]}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={pick}
              disabled={images.length >= MAX_PHOTOS}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  opacity: pressed || images.length >= MAX_PHOTOS ? 0.6 : 1,
                },
              ]}
            >
              <Feather name="upload" size={14} color={colors.foreground} />
              <Text style={[styles.btnText, { color: colors.foreground }]}>Upload</Text>
            </Pressable>
          </View>
          {category === "lego" && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Background removal skipped for LEGO.
            </Text>
          )}
          {mode === "advanced" && images.length === 1 && category !== "lego" && (
            <Text style={[styles.hint, { color: colors.neonYellow }]}>
              Add a back photo for higher confidence.
            </Text>
          )}

          {(images.length > 0 || bgRemoving) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {images.map((uri, idx) => (
                <View key={idx} style={[styles.thumb, { borderColor: colors.border }]}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="contain" />
                  {isPending && <ScanOverlay />}
                  <Pressable
                    onPress={() => removeImage(idx)}
                    style={[styles.thumbX, { backgroundColor: colors.background, borderColor: colors.border }]}
                    hitSlop={6}
                  >
                    <Feather name="x" size={10} color={colors.foreground} />
                  </Pressable>
                  <View style={[styles.thumbTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={{ color: colors.foreground, fontSize: 9, fontFamily: "Inter_500Medium" }}>
                      {idx === 0 ? "Front" : `#${idx + 1}`}
                    </Text>
                  </View>
                </View>
              ))}
              {bgRemoving && (
                <View
                  style={[
                    styles.thumb,
                    { borderColor: colors.border, alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <ActivityIndicator color={colors.neonBlue} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 4 }}>
                    Removing bg…
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Analyze */}
          <Pressable
            onPress={runAnalyze}
            disabled={isPending || bgRemoving}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.neonBlue,
                opacity: isPending || bgRemoving || pressed ? 0.6 : 1,
              },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="zap" size={14} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {mode === "advanced" ? "Run advanced analysis" : "Look up price"}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {analyzeError && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium" }}>
              {analyzeError}
            </Text>
            <Pressable
              onPress={runAnalyze}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.border, alignSelf: "flex-start", marginTop: 10, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={14} color={colors.foreground} />
              <Text style={[styles.btnText, { color: colors.foreground }]}>Try again</Text>
            </Pressable>
          </View>
        )}

        {isPending && <ResultsSkeleton colors={colors} mode={mode} hasImage={images.length > 0} />}

        {result && (
          <ResultsCard
            result={result}
            image={primaryImage}
            mode={mode}
            colors={colors}
            openSections={openSections}
            toggleSection={toggleSection}
            aiBannerDismissed={aiBannerDismissed}
            dismissAiBanner={() => setAiBannerDismissed(true)}
            onReset={reset}
          />
        )}
      </View>
    </PageShell>
  );
}

function ModeToggle({
  mode,
  onChange,
  colors,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <View style={[styles.segment, { borderColor: colors.border, alignSelf: "flex-end" }]}>
        {(["standard", "advanced"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={({ pressed }) => [
                styles.segmentBtn,
                {
                  backgroundColor: active ? colors.primary : "transparent",
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: "row",
                  gap: 4,
                },
              ]}
            >
              {m === "advanced" && (
                <Feather name="star" size={10} color={active ? colors.primaryForeground : colors.mutedForeground} />
              )}
              <Text
                style={{
                  color: active ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 11,
                  textTransform: "capitalize",
                }}
              >
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: "right" }}>
        {mode === "standard"
          ? "Quick lookup — current market prices"
          : "Full analysis — all sources + AI grading"}
      </Text>
    </View>
  );
}

function ResultsSkeleton({
  colors,
  mode,
  hasImage,
}: {
  colors: ReturnType<typeof useColors>;
  mode: Mode;
  hasImage: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 10 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator color={colors.neonBlue} size="small" />
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Fetching prices…</Text>
      </View>
      {mode === "advanced" && hasImage && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator color={colors.neonBlue} size="small" />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>AI analyzing photo…</Text>
        </View>
      )}
    </View>
  );
}

function ResultsCard({
  result,
  image,
  mode,
  colors,
  openSections,
  toggleSection,
  aiBannerDismissed,
  dismissAiBanner,
  onReset,
}: {
  result: ScannerAnalyzeResult;
  image: string | null;
  mode: Mode;
  colors: ReturnType<typeof useColors>;
  openSections: Record<string, boolean>;
  toggleSection: (k: string) => void;
  aiBannerDismissed: boolean;
  dismissAiBanner: () => void;
  onReset: () => void;
}) {
  const hasAi = Boolean(result.aiGrade) && !result.aiError;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={[styles.headerImg, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          {image ? (
            <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <Feather name="image" size={28} color={colors.mutedForeground} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={2}>
            {result.name}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
            {result.set ?? "Unknown set"}
            {result.year ? ` · ${result.year}` : ""}
          </Text>
          <View style={styles.badgeRow}>
            {result.isMockData && (
              <Badge text="Mock data" color={colors.neonYellow} colors={colors} />
            )}
            {result.recentSoldCount > 0 && (
              <Badge text={`${result.recentSoldCount} recent sales`} colors={colors} />
            )}
            {result.sources.map((s) => (
              <Badge key={s} text={s} colors={colors} />
            ))}
          </View>
        </View>
      </View>

      {/* AI error banner */}
      {result.aiError && !aiBannerDismissed && (
        <View
          style={[
            styles.banner,
            { borderColor: colors.neonYellow, backgroundColor: "rgba(255, 200, 0, 0.08)" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              AI analysis unavailable
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
              {result.aiErrorReason ?? "AI grading could not run."}
            </Text>
          </View>
          <Pressable onPress={dismissAiBanner} hitSlop={6}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* Advanced sections */}
      {mode === "advanced" ? (
        <View style={{ marginTop: 12, gap: 4 }}>
          <Section
            id="ai"
            title="AI Grade Analysis"
            icon="star"
            iconColor={colors.neonBlue}
            open={openSections.ai}
            onToggle={toggleSection}
            colors={colors}
          >
            {!hasAi ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontStyle: "italic" }}>
                {image ? "AI grading not available for this scan." : "Add a photo to get an AI grade."}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
                  <View>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Estimated grade</Text>
                    <Text style={{ color: colors.neonBlue, fontFamily: "Fraunces_700Bold", fontSize: 28 }}>
                      {result.aiGradeRange ?? result.aiGrade}
                    </Text>
                  </View>
                  {result.aiConfidence && (
                    <Badge
                      text={`${result.aiConfidence} confidence`}
                      color={
                        result.aiConfidence === "high"
                          ? colors.neonGreen
                          : result.aiConfidence === "low"
                            ? colors.neonYellow
                            : colors.mutedForeground
                      }
                      colors={colors}
                    />
                  )}
                  {result.marketImpliedGrade && result.aiGrade && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                      Market implies <Text style={{ color: colors.foreground }}>{result.marketImpliedGrade}</Text>
                    </Text>
                  )}
                </View>

                {result.aiSubGrades && (
                  <View style={styles.subGrid}>
                    {(
                      [
                        { label: "Centering", v: result.aiSubGrades.centering },
                        { label: "Corners", v: result.aiSubGrades.corners },
                        { label: "Edges", v: result.aiSubGrades.edges },
                        { label: "Surface", v: result.aiSubGrades.surface },
                      ] as const
                    ).map((s) => (
                      <View key={s.label} style={[styles.subCell, { borderColor: colors.border }]}>
                        <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                        <Text style={{ color: colors.foreground, fontFamily: "Fraunces_700Bold", fontSize: 18 }}>
                          {s.v ? s.v.toFixed(1) : "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {result.aiReasoning && (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      fontStyle: "italic",
                      borderLeftWidth: 2,
                      borderLeftColor: colors.neonBlue,
                      paddingLeft: 10,
                    }}
                  >
                    {result.aiReasoning}
                  </Text>
                )}

                {result.defects.length > 0 && (
                  <View>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Defects</Text>
                    {result.defects.map((d, i) => (
                      <Text key={i} style={{ color: colors.foreground, fontSize: 12, marginTop: 2 }}>
                        • {d}
                      </Text>
                    ))}
                  </View>
                )}
                {result.centering && (
                  <View>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Centering</Text>
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>{result.centering}</Text>
                  </View>
                )}
                {result.surfaceNotes && (
                  <View>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Surface</Text>
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>{result.surfaceNotes}</Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {result.authenticityOk === false || result.authenticityFlags.length > 0 ? (
                    <>
                      <Feather name="alert-triangle" size={14} color={colors.neonYellow} />
                      <Text style={{ color: colors.neonYellow, fontSize: 12, flex: 1 }}>
                        Authenticity:{" "}
                        <Text style={{ color: colors.foreground }}>
                          {result.authenticityFlags.join("; ") || "Possible concerns"}
                        </Text>
                      </Text>
                    </>
                  ) : (
                    <>
                      <Feather name="shield" size={14} color={colors.neonGreen} />
                      <Text style={{ color: colors.neonGreen, fontSize: 12 }}>No authenticity concerns</Text>
                    </>
                  )}
                </View>
              </View>
            )}
          </Section>

          <Section
            id="market"
            title="Market Data"
            open={openSections.market}
            onToggle={toggleSection}
            colors={colors}
          >
            <PriceTriple result={result} colors={colors} />
            {result.extendedPrices.length > 0 && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {result.extendedPrices.map((p, i) => (
                  <View key={i} style={[styles.extPrice, { borderColor: colors.border }]}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{p.label}</Text>
                    <Text style={{ color: colors.foreground, fontFamily: "Fraunces_600SemiBold", fontSize: 15 }}>
                      {p.value}
                    </Text>
                    {p.note && (
                      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>{p.note}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Section>

          {result.priceLadder && result.priceLadder.length > 0 && (
            <Section
              id="ladder"
              title="Price by Grade"
              open={openSections.ladder}
              onToggle={toggleSection}
              colors={colors}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 8 }}>
                Typical value at each PSA grade.
              </Text>
              <View style={styles.ladderGrid}>
                {result.priceLadder.map((rung) => {
                  const matchesAi =
                    result.aiGrade && rung.grade.includes(result.aiGrade.replace(/^PSA\s*/i, ""));
                  const matchesMarket = rung.grade === result.marketImpliedGrade;
                  return (
                    <View
                      key={rung.grade}
                      style={[
                        styles.ladderCell,
                        {
                          borderColor: matchesAi
                            ? colors.neonBlue
                            : matchesMarket
                              ? colors.neonGreen
                              : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{rung.grade}</Text>
                      <Text style={{ color: colors.foreground, fontFamily: "Fraunces_600SemiBold", fontSize: 13 }}>
                        {fmt(rung.price)}
                      </Text>
                      {(matchesAi || matchesMarket) && (
                        <Text
                          style={{
                            color: matchesAi ? colors.neonBlue : colors.neonGreen,
                            fontSize: 9,
                            marginTop: 2,
                          }}
                        >
                          {matchesAi ? "AI grade" : "Market"}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

          <Section
            id="history"
            title="Price History"
            open={openSections.history}
            onToggle={toggleSection}
            colors={colors}
          >
            <Sparkline values={result.priceHistorySparkline} color={colors.neonBlue} />
            {result.priceHistorySparkline.length > 0 && (
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 6 }}>
                Last 6 months (illustrative)
              </Text>
            )}
          </Section>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <PriceTriple result={result} colors={colors} />
        </View>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="refresh-cw" size={14} color={colors.foreground} />
          <Text style={[styles.btnText, { color: colors.foreground }]}>Scan another</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PriceTriple({
  result,
  colors,
}: {
  result: ScannerAnalyzeResult;
  colors: ReturnType<typeof useColors>;
}) {
  const cells = useMemo(
    () => [
      { label: "Low", v: result.priceRange.low, color: colors.mutedForeground },
      { label: "Mid", v: result.priceRange.mid, color: colors.neonBlue },
      { label: "High", v: result.priceRange.high, color: colors.neonGreen },
    ],
    [result, colors],
  );
  return (
    <View style={styles.priceRow}>
      {cells.map((c) => (
        <View key={c.label} style={[styles.priceCell, { borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{c.label}</Text>
          <Text style={{ color: c.color, fontFamily: "Fraunces_700Bold", fontSize: 18, marginTop: 2 }}>
            {fmt(c.v)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Section({
  id,
  title,
  icon,
  iconColor,
  open,
  onToggle,
  colors,
  children,
}: {
  id: string;
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  open: boolean;
  onToggle: (k: string) => void;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => onToggle(id)}
        style={({ pressed }) => [styles.sectionHeader, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Feather name={icon} size={14} color={iconColor ?? colors.foreground} />}
          <Text
            style={{
              color: iconColor ?? colors.foreground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            {title}
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open && <View style={{ paddingTop: 4, paddingBottom: 12 }}>{children}</View>}
    </View>
  );
}

function Badge({
  text,
  color,
  colors,
}: {
  text: string;
  color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: color ?? colors.border, backgroundColor: "transparent" },
      ]}
    >
      <Text
        style={{
          color: color ?? colors.mutedForeground,
          fontSize: 9,
          fontFamily: "Inter_600SemiBold",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length === 0) {
    return (
      <Text style={{ color: "#888", fontSize: 12, fontStyle: "italic" }}>
        Price history not available
      </Text>
    );
  }
  const w = 280;
  const h = 60;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  h: { fontFamily: "Fraunces_700Bold", fontSize: 24 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 8, padding: 3, alignSelf: "flex-start" },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  btnRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 14,
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hint: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 6 },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbX: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbTag: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  headerImg: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { fontFamily: "Fraunces_600SemiBold", fontSize: 18 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  badge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  banner: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "flex-start",
  },
  section: { borderTopWidth: 1, paddingTop: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  miniLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  priceRow: { flexDirection: "row", gap: 8 },
  priceCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  extPrice: { borderWidth: 1, borderRadius: 8, padding: 10 },
  subGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  subCell: {
    flexBasis: "23%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  ladderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ladderCell: {
    flexBasis: "30%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
});
