import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useGetVaultItem,
  useGetVaultItemPrices,
  useUpdateVaultItem,
  useDeleteVaultItem,
  type CollectionItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { DUMMY_VAULT_ITEMS } from "@/constants/demoData";
import { useIsSignedIn } from "@/components/AuthGate";
import { PageShell } from "@/components/PageShell";
import { qopt } from "@/lib/api";
import { formatCurrency, formatPercent, formatRelativeDate, conditionLabel, CONDITIONS } from "@/lib/format";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { isSignedIn } = useIsSignedIn();
  const numericId = Number(id);
  const isNumeric = !Number.isNaN(numericId);

  const { data: detail, isLoading } = useGetVaultItem(numericId, qopt(isSignedIn && isNumeric));
  const { data: prices } = useGetVaultItemPrices(numericId, qopt(isSignedIn && isNumeric));
  const qc = useQueryClient();
  const updMut = useUpdateVaultItem();
  const delMut = useDeleteVaultItem();
  const [editOpen, setEditOpen] = useState(false);

  const canEdit = isSignedIn && isNumeric && !!detail?.item;

  const onDelete = () => {
    if (!canEdit) return;
    Alert.alert("Delete item?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          delMut.mutate(
            { id: numericId },
            {
              onSuccess: () => {
                qc.invalidateQueries();
                router.replace("/(tabs)/vault");
              },
              onError: (e) =>
                Alert.alert(
                  "Could not delete",
                  e instanceof Error ? e.message : "Something went wrong.",
                ),
            },
          );
        },
      },
    ]);
  };

  const demoItem = DUMMY_VAULT_ITEMS.find((i) => i.id === id);

  const item =
    detail?.item ??
    (demoItem
      ? {
          id: 0,
          name: demoItem.name,
          brand: demoItem.gameOrTheme,
          category: demoItem.category,
          condition: demoItem.condition,
          purchasePrice: demoItem.purchasePrice,
          currentValue: demoItem.currentValue,
          notes: demoItem.notes,
          photos: [] as string[],
          tags: [] as string[],
          purchaseDate: demoItem.dateAdded,
          createdAt: demoItem.dateAdded,
          updatedAt: demoItem.dateAdded,
        }
      : null);

  if (!item && !isLoading) {
    return (
      <PageShell title="Item">
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 8 }}>
            Item not found
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.neonBlue, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
          </Pressable>
        </View>
      </PageShell>
    );
  }

  if (!item) {
    return (
      <PageShell title="Item">
        <ActivityIndicator color={colors.neonBlue} style={{ marginTop: 40 }} />
      </PageShell>
    );
  }

  const value = item.currentValue ?? 0;
  const cost = item.purchasePrice ?? 0;
  const gain = value - cost;
  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
  const positive = gain >= 0;
  const deltaColor = positive ? colors.neonGreen : colors.neonRed;

  return (
    <PageShell title="Item Details">
      {canEdit && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setEditOpen(true)}
            style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name="edit-2" size={14} color={colors.foreground} />
            <Text style={[styles.actionTxt, { color: colors.foreground }]}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={delMut.isPending}
            style={[styles.actionBtn, { borderColor: colors.neonRed, backgroundColor: colors.card }]}
          >
            <Feather name="trash-2" size={14} color={colors.neonRed} />
            <Text style={[styles.actionTxt, { color: colors.neonRed }]}>
              {delMut.isPending ? "Deleting…" : "Delete"}
            </Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.thumb, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="image" size={48} color={colors.mutedForeground} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.cat, { color: colors.neonGreen }]}>{item.category}</Text>
        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
        {item.brand && (
          <Text style={[styles.brand, { color: colors.mutedForeground }]}>{item.brand}</Text>
        )}

        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Current value</Text>
            <Text style={[styles.priceVal, { color: colors.foreground }]}>{formatCurrency(value)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Gain</Text>
            <Text style={[styles.priceVal, { color: deltaColor }]}>{formatCurrency(gain)}</Text>
            <Text style={[styles.pricePct, { color: deltaColor }]}>{formatPercent(gainPct)}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta label="Condition" value={conditionLabel(item.condition)} />
          <Meta label="Cost basis" value={formatCurrency(cost)} />
          <Meta label="Added" value={formatRelativeDate(item.createdAt)} />
          {item.purchaseDate && <Meta label="Purchased" value={formatRelativeDate(item.purchaseDate)} />}
        </View>

        {item.notes && (
          <View style={[styles.notes, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{item.notes}</Text>
          </View>
        )}

        {prices && prices.length > 0 && (
          <View style={styles.notes}>
            <Text style={[styles.notesLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>
              Recent prices
            </Text>
            {prices.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.priceRow}>
                <Text style={[styles.priceSrc, { color: colors.mutedForeground }]}>
                  {p.source} · {formatRelativeDate(p.recordedAt)}
                </Text>
                <Text style={[styles.priceVal2, { color: colors.foreground }]}>
                  {formatCurrency(p.price)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {canEdit && detail?.item && (
        <EditItemModal
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          id={numericId}
          item={detail.item}
          colors={colors}
          updMut={updMut}
          onSaved={() => {
            qc.invalidateQueries();
            setEditOpen(false);
          }}
        />
      )}
    </PageShell>
  );
}

function EditItemModal({
  visible,
  onClose,
  id,
  item,
  colors,
  updMut,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  id: number;
  item: CollectionItem;
  colors: ReturnType<typeof useColors>;
  updMut: ReturnType<typeof useUpdateVaultItem>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [condition, setCondition] = useState(item.condition);
  const [purchaseStr, setPurchaseStr] = useState(
    item.purchasePrice != null ? String(item.purchasePrice) : "",
  );
  const [valueStr, setValueStr] = useState(
    item.currentValue != null ? String(item.currentValue) : "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");

  useEffect(() => {
    if (visible) {
      setName(item.name);
      setBrand(item.brand ?? "");
      setCondition(item.condition);
      setPurchaseStr(item.purchasePrice != null ? String(item.purchasePrice) : "");
      setValueStr(item.currentValue != null ? String(item.currentValue) : "");
      setNotes(item.notes ?? "");
    }
  }, [visible, item]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    const purchase = purchaseStr ? Number(purchaseStr) : undefined;
    const value = valueStr ? Number(valueStr) : undefined;
    updMut.mutate(
      {
        id,
        data: {
          name: trimmed,
          brand: brand.trim() || undefined,
          condition,
          purchasePrice: Number.isFinite(purchase as number) ? purchase : undefined,
          currentValue: Number.isFinite(value as number) ? value : undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: onSaved,
        onError: (e) =>
          Alert.alert(
            "Could not save",
            e instanceof Error ? e.message : "Something went wrong.",
          ),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={editStyles.backdrop}>
        <View
          style={[
            editStyles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={editStyles.handle} />
          <Text style={[editStyles.title, { color: colors.foreground }]}>Edit item</Text>
          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                editStyles.input,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Brand</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand"
              placeholderTextColor={colors.mutedForeground}
              style={[
                editStyles.input,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Condition</Text>
            <View style={editStyles.chipRow}>
              {CONDITIONS.map((c) => {
                const active = c.value === condition;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setCondition(c.value)}
                    style={[
                      editStyles.chip,
                      {
                        borderColor: active ? colors.neonBlue : colors.border,
                        backgroundColor: active ? colors.neonBlue + "22" : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.neonBlue : colors.foreground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Purchase price</Text>
            <TextInput
              value={purchaseStr}
              onChangeText={setPurchaseStr}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                editStyles.input,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Current value</Text>
            <TextInput
              value={valueStr}
              onChangeText={setValueStr}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                editStyles.input,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <Text style={[editStyles.label, { color: colors.mutedForeground }]}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                editStyles.input,
                { borderColor: colors.border, color: colors.foreground, minHeight: 70 },
              ]}
            />
          </ScrollView>
          <View style={editStyles.btnRow}>
            <Pressable
              onPress={onClose}
              disabled={updMut.isPending}
              style={[editStyles.btn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={updMut.isPending}
              style={[
                editStyles.btn,
                { borderColor: colors.neonBlue, backgroundColor: colors.neonBlue + "22" },
              ]}
            >
              <Text style={{ color: colors.neonBlue, fontFamily: "Inter_600SemiBold" }}>
                {updMut.isPending ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metaCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    margin: 16,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 20, gap: 6 },
  cat: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontFamily: "Fraunces_700Bold", fontSize: 26, marginTop: 4 },
  brand: { fontFamily: "Inter_500Medium", fontSize: 13 },
  priceCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  priceLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  priceVal: { fontFamily: "Fraunces_700Bold", fontSize: 22, marginTop: 2 },
  pricePct: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metaCell: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  notes: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  notesLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  notesText: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, lineHeight: 18 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceSrc: { fontFamily: "Inter_400Regular", fontSize: 12 },
  priceVal2: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  center: { alignItems: "center", padding: 60 },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

const editStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 12,
  },
  title: { fontFamily: "Fraunces_700Bold", fontSize: 20, marginBottom: 12 },
  label: { fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
