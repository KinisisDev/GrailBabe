import React, { useState, useCallback } from "react";
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

const CATEGORIES = ["TCG", "LEGO", "Sports", "Comics", "Coins", "Other"];

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
  const [category, setCategory] = useState("TCG");
  const [condition, setCondition] = useState<CollectionItemInputCondition>("near_mint");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!name.trim() || !category) {
      setErr("Name and category are required.");
      return;
    }
    setErr(null);
    try {
      await create.mutateAsync({
        data: {
          name: name.trim(),
          category,
          condition,
          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
          currentValue: currentValue ? Number(currentValue) : undefined,
          notes: notes || undefined,
        },
      });
      router.back();
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [name, category, condition, purchasePrice, currentValue, notes, create, router]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
  ];

  return (
    <PageShell title="Add Item" scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Charizard 4/102"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.neonGreen : colors.card,
                      borderColor: active ? colors.neonGreen : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? "#0a0a0f" : colors.foreground }]}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Storage, condition details…"
            placeholderTextColor={colors.mutedForeground}
          />

          {err && <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>}

          <Pressable
            onPress={submit}
            disabled={create.isPending}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.neonGreen, opacity: create.isPending || pressed ? 0.85 : 1 },
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
