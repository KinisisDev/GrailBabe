import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import {
  useCreateVaultItem,
  getListVaultItemsQueryKey,
  type CollectionItemInputCondition,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { CONDITIONS } from "@/lib/format";
import {
  TCG_GAMES,
  type TcgGameSlug,
  type ItemType,
  tcgCategory,
  legoCategory,
  sportsCategory,
  encodeNotes,
} from "@/lib/vaultCategory";

type TopCategory = "tcg" | "lego" | "sports";
const TOP_CATEGORIES: { key: TopCategory; label: string }[] = [
  { key: "tcg", label: "TCG" },
  { key: "lego", label: "LEGO" },
  { key: "sports", label: "Sports" },
];

export default function AddVaultItemScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSignedIn } = useIsSignedIn();
  const create = useCreateVaultItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVaultItemsQueryKey() });
      },
    },
  });

  const [name, setName] = useState("");
  const [topCategory, setTopCategory] = useState<TopCategory>("tcg");
  const [tcgGame, setTcgGame] = useState<TcgGameSlug>("pokemon");
  const [itemType, setItemType] = useState<ItemType>("single");
  const [condition, setCondition] = useState<CollectionItemInputCondition>("near_mint");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  // Detail fields kept generic but stored in notes JSON
  const [cardNumber, setCardNumber] = useState("");
  const [gradingService, setGradingService] = useState<"Raw" | "PSA" | "BGS" | "CGC">("Raw");
  const [grade, setGrade] = useState("");
  const [setNumber, setSetNumber] = useState("");
  const [theme, setTheme] = useState("");
  const [year, setYear] = useState("");
  const [legoStatus, setLegoStatus] = useState<"Sealed" | "Built" | "Incomplete">("Sealed");
  const [freeNotes, setFreeNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const encodedCategory = useMemo(() => {
    if (topCategory === "tcg") return tcgCategory(tcgGame, itemType);
    if (topCategory === "lego") return legoCategory(itemType);
    return sportsCategory();
  }, [topCategory, tcgGame, itemType]);

  const submit = useCallback(async () => {
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    setErr(null);
    const notes =
      topCategory === "tcg"
        ? itemType === "single"
          ? encodeNotes({
              text: freeNotes || undefined,
              cardNumber: cardNumber || undefined,
              gradingService,
              grade: grade || undefined,
            })
          : encodeNotes({
              text: freeNotes || undefined,
              releaseYear: year ? Number(year) : undefined,
              sealed: legoStatus === "Sealed",
            })
        : topCategory === "lego"
          ? encodeNotes({
              text: freeNotes || undefined,
              setNumber: setNumber || undefined,
              theme: theme || undefined,
              year: year ? Number(year) : undefined,
              status: legoStatus,
            })
          : encodeNotes({
              text: freeNotes || undefined,
              cardNumber: cardNumber || undefined,
              gradingService,
              grade: grade || undefined,
              year: year ? Number(year) : undefined,
            });
    try {
      await create.mutateAsync({
        data: {
          name: name.trim(),
          category: encodedCategory,
          condition,
          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
          currentValue: currentValue ? Number(currentValue) : undefined,
          notes,
        },
      });
      router.back();
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [
    name,
    topCategory,
    itemType,
    encodedCategory,
    condition,
    purchasePrice,
    currentValue,
    cardNumber,
    gradingService,
    grade,
    setNumber,
    theme,
    year,
    legoStatus,
    freeNotes,
    create,
    router,
  ]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
  ];

  const Chips = <T extends string>({
    options,
    value,
    onChange,
    accent,
  }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    accent: string;
  }) => (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? accent : colors.card,
                borderColor: active ? accent : colors.border,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? "#0a0a0f" : colors.foreground }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <PageShell title="Add Item" scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!isSignedIn && <SignInPrompt message="Sign in to add items to your vault." />}

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder={
              topCategory === "lego" ? "Hogwarts Castle 71043" : "Charizard 4/102"
            }
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <Chips
            options={TOP_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            value={topCategory}
            onChange={setTopCategory}
            accent={colors.neonGreen}
          />

          {topCategory === "tcg" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Game</Text>
              <Chips
                options={TCG_GAMES.map((g) => ({ value: g.slug, label: g.name }))}
                value={tcgGame}
                onChange={setTcgGame}
                accent={colors.neonBlue}
              />
            </>
          )}

          {(topCategory === "tcg" || topCategory === "lego") && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <Chips
                options={[
                  { value: "single", label: topCategory === "lego" ? "Minifig" : "Single" },
                  { value: "set", label: topCategory === "lego" ? "Set" : "Sealed Set" },
                ]}
                value={itemType}
                onChange={setItemType}
                accent={colors.neonYellow}
              />
            </>
          )}

          {topCategory === "tcg" && itemType === "single" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Card #</Text>
              <TextInput
                style={inputStyle}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="4/102"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Grading</Text>
              <Chips
                options={(["Raw", "PSA", "BGS", "CGC"] as const).map((g) => ({
                  value: g,
                  label: g,
                }))}
                value={gradingService}
                onChange={setGradingService}
                accent={colors.neonBlue}
              />
              {gradingService !== "Raw" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Grade</Text>
                  <TextInput
                    style={inputStyle}
                    value={grade}
                    onChangeText={setGrade}
                    placeholder="9.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}
            </>
          )}

          {topCategory === "lego" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Set number</Text>
              <TextInput
                style={inputStyle}
                value={setNumber}
                onChangeText={setSetNumber}
                placeholder="71043"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Theme</Text>
              <TextInput
                style={inputStyle}
                value={theme}
                onChangeText={setTheme}
                placeholder="Harry Potter"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Year</Text>
              <TextInput
                style={inputStyle}
                value={year}
                onChangeText={setYear}
                placeholder="2018"
                keyboardType="number-pad"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
              <Chips
                options={(["Sealed", "Built", "Incomplete"] as const).map((s) => ({
                  value: s,
                  label: s,
                }))}
                value={legoStatus}
                onChange={setLegoStatus}
                accent={colors.neonGreen}
              />
            </>
          )}

          {topCategory === "sports" && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Card #</Text>
              <TextInput
                style={inputStyle}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="#27"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Year</Text>
              <TextInput
                style={inputStyle}
                value={year}
                onChangeText={setYear}
                placeholder="2018"
                keyboardType="number-pad"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Grading</Text>
              <Chips
                options={(["Raw", "PSA", "BGS", "CGC"] as const).map((g) => ({
                  value: g,
                  label: g,
                }))}
                value={gradingService}
                onChange={setGradingService}
                accent={colors.neonBlue}
              />
              {gradingService !== "Raw" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Grade</Text>
                  <TextInput
                    style={inputStyle}
                    value={grade}
                    onChangeText={setGrade}
                    placeholder="9.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}
            </>
          )}

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Condition</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((c) => {
              const active = c.value === condition;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCondition(c.value as CollectionItemInputCondition)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.neonBlue : colors.card,
                      borderColor: active ? colors.neonBlue : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? "#0a0a0f" : colors.foreground }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost</Text>
              <TextInput
                style={inputStyle}
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Current value</Text>
              <TextInput
                style={inputStyle}
                value={currentValue}
                onChangeText={setCurrentValue}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
          <TextInput
            style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
            value={freeNotes}
            onChangeText={setFreeNotes}
            multiline
            placeholder="Storage, condition details…"
            placeholderTextColor={colors.mutedForeground}
          />

          {err && <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>}

          <Pressable
            onPress={submit}
            disabled={create.isPending || !isSignedIn}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: colors.neonGreen,
                opacity: create.isPending || pressed || !isSignedIn ? 0.5 : 1,
              },
            ]}
          >
            {create.isPending ? (
              <ActivityIndicator color="#0a0a0f" />
            ) : (
              <>
                <Feather name="plus" size={16} color="#0a0a0f" />
                <Text style={[styles.btnText]}>Add to vault</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 8 },
  btn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#0a0a0f" },
});
