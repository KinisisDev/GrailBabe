import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTrades,
  useCreateTrade,
  useMakeTradeOffer,
  getListTradesQueryKey,
  getListMyTradesQueryKey,
  type TradePost,
  type TradePostInputKind,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { qopt } from "@/lib/api";

const KINDS = ["all", "trade", "sell", "buy"] as const;
const POST_KINDS: TradePostInputKind[] = ["trade", "sell", "buy"];
const CATEGORIES = ["TCG", "LEGO", "Sports", "Comics", "Coins", "Other"];

const DEMO_TRADES: TradePost[] = [
  {
    id: 1,
    userId: "u1",
    userName: "kaibacorp",
    title: "Have BGS 9.5 Charizard, want LEGO UCS sets",
    description: "Looking for Star Wars UCS, condition matters.",
    category: "TCG",
    condition: "BGS 9.5",
    askingPrice: null,
    photos: [],
    kind: "trade",
    wantedItems: ["UCS Falcon", "UCS Star Destroyer"],
    status: "open",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 2,
    userId: "u2",
    userName: "brickmaster99",
    title: "Selling sealed Hogwarts Castle",
    description: "Mint box, original packaging.",
    category: "LEGO",
    condition: "Sealed",
    askingPrice: 480,
    photos: [],
    kind: "sell",
    wantedItems: [],
    status: "open",
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
];

export default function TradesScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSignedIn } = useIsSignedIn();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [showCompose, setShowCompose] = useState(false);
  const [offerBusyId, setOfferBusyId] = useState<number | null>(null);
  const [offerErr, setOfferErr] = useState<string | null>(null);

  const { data, isLoading } = useListTrades({}, qopt(isSignedIn));
  const filtered = (data ?? []).filter((t) => kind === "all" || t.kind === kind);
  const list =
    filtered.length > 0
      ? filtered
      : !isSignedIn
        ? DEMO_TRADES.filter((t) => kind === "all" || t.kind === kind)
        : [];

  // Compose form state
  const [postKind, setPostKind] = useState<TradePostInputKind>("trade");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TCG");
  const [condition, setCondition] = useState("Near Mint");
  const [askingPrice, setAskingPrice] = useState("");
  const [wantedRaw, setWantedRaw] = useState("");
  const [composeErr, setComposeErr] = useState<string | null>(null);

  const createTrade = useCreateTrade({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
        qc.invalidateQueries({ queryKey: getListMyTradesQueryKey({ status: "all" }) });
      },
    },
  });

  const makeOffer = useMakeTradeOffer({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
        qc.invalidateQueries({ queryKey: getListMyTradesQueryKey({ status: "all" }) });
      },
    },
  });

  const handleMakeOffer = useCallback(
    async (tradeId: number) => {
      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }
      setOfferBusyId(tradeId);
      setOfferErr(null);
      try {
        await makeOffer.mutateAsync({ id: tradeId });
        router.push("/my-trades");
      } catch (e) {
        setOfferErr((e as Error).message);
      } finally {
        setOfferBusyId(null);
      }
    },
    [isSignedIn, makeOffer, router],
  );

  const reset = () => {
    setTitle("");
    setDescription("");
    setAskingPrice("");
    setWantedRaw("");
    setComposeErr(null);
  };

  const submitTrade = useCallback(async () => {
    if (!title.trim()) {
      setComposeErr("Title is required.");
      return;
    }
    if (postKind === "sell" && !askingPrice) {
      setComposeErr("Asking price is required for sells.");
      return;
    }
    setComposeErr(null);
    try {
      await createTrade.mutateAsync({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          condition,
          kind: postKind,
          askingPrice: askingPrice ? Number(askingPrice) : undefined,
          wantedItems: wantedRaw
            ? wantedRaw
                .split(",")
                .map((w) => w.trim())
                .filter(Boolean)
            : undefined,
        },
      });
      reset();
      setShowCompose(false);
    } catch (e) {
      setComposeErr((e as Error).message);
    }
  }, [title, description, category, condition, postKind, askingPrice, wantedRaw, createTrade]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
  ];

  return (
    <PageShell title="Trading Board">
      <View style={styles.headerRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {KINDS.map((k) => {
            const active = k === kind;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.neonGreen : colors.card,
                    borderColor: active ? colors.neonGreen : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? "#0a0a0f" : colors.mutedForeground },
                  ]}
                >
                  {k}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => (isSignedIn ? setShowCompose(true) : router.push("/sign-in"))}
          style={({ pressed }) => [
            styles.postBtn,
            { backgroundColor: colors.neonGreen, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={14} color="#0a0a0f" />
          <Text style={styles.postBtnText}>Post</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator color={colors.neonGreen} style={{ marginTop: 24 }} />}

      <View style={styles.list}>
        {list.map((t) => (
          <View
            key={t.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.metaRow}>
              <Text style={[styles.kind, { color: colors.neonGreen, borderColor: colors.neonGreen }]}>
                {t.kind}
              </Text>
              <Text style={[styles.user, { color: colors.mutedForeground }]}>
                @{t.userName} · {formatRelativeDate(t.createdAt)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
            {t.description && (
              <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={3}>
                {t.description}
              </Text>
            )}
            {t.wantedItems && t.wantedItems.length > 0 && (
              <Text style={[styles.wanted, { color: colors.mutedForeground }]} numberOfLines={2}>
                Wants: {t.wantedItems.join(", ")}
              </Text>
            )}
            <View style={styles.footer}>
              <Text style={[styles.cat, { color: colors.mutedForeground }]}>
                {t.category} · {t.condition}
              </Text>
              {t.askingPrice != null && (
                <Text style={[styles.price, { color: colors.neonYellow }]}>
                  {formatCurrency(t.askingPrice)}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => handleMakeOffer(t.id)}
              disabled={offerBusyId === t.id}
              style={({ pressed }) => [
                styles.offerBtn,
                {
                  borderColor: colors.neonBlue,
                  opacity: pressed || offerBusyId === t.id ? 0.6 : 1,
                },
              ]}
            >
              {offerBusyId === t.id ? (
                <ActivityIndicator color={colors.neonBlue} size="small" />
              ) : (
                <>
                  <Feather name="send" size={13} color={colors.neonBlue} />
                  <Text style={[styles.offerBtnText, { color: colors.neonBlue }]}>
                    Make offer
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ))}
        {offerErr && (
          <Text style={[styles.err, { color: colors.destructive, paddingHorizontal: 4 }]}>
            {offerErr}
          </Text>
        )}
        {list.length === 0 && !isLoading && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No trade posts yet.
          </Text>
        )}
        {!isSignedIn && (
          <View style={{ marginTop: 12 }}>
            <SignInPrompt message="Sign in to post a trade or make offers." />
          </View>
        )}
      </View>

      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCompose(false)}>
              <Text style={[styles.modalAction, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New trade post</Text>
            <Pressable onPress={submitTrade} disabled={createTrade.isPending}>
              {createTrade.isPending ? (
                <ActivityIndicator color={colors.neonGreen} />
              ) : (
                <Text style={[styles.modalAction, { color: colors.neonGreen }]}>Post</Text>
              )}
            </Pressable>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Kind</Text>
              <View style={styles.chipRow}>
                {POST_KINDS.map((k) => {
                  const active = k === postKind;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setPostKind(k)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.neonBlue : colors.card,
                          borderColor: active ? colors.neonBlue : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#0a0a0f" : colors.foreground },
                        ]}
                      >
                        {k}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput
                style={inputStyle}
                value={title}
                onChangeText={setTitle}
                placeholder="Have BGS 9.5 Charizard, want UCS LEGO"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Details, condition notes, photos available on request…"
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
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#0a0a0f" : colors.foreground },
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Condition</Text>
              <TextInput
                style={inputStyle}
                value={condition}
                onChangeText={setCondition}
                placeholder="Near Mint, PSA 9, Sealed…"
                placeholderTextColor={colors.mutedForeground}
              />

              {(postKind === "sell" || postKind === "buy") && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    {postKind === "sell" ? "Asking price *" : "Budget"}
                  </Text>
                  <TextInput
                    style={inputStyle}
                    value={askingPrice}
                    onChangeText={setAskingPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}

              {postKind === "trade" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    Wanted items (comma-separated)
                  </Text>
                  <TextInput
                    style={inputStyle}
                    value={wantedRaw}
                    onChangeText={setWantedRaw}
                    placeholder="UCS Falcon, UCS Star Destroyer"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}

              {composeErr && (
                <Text style={[styles.err, { color: colors.destructive }]}>{composeErr}</Text>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    gap: 8,
  },
  filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8, flexGrow: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize" },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#0a0a0f" },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kind: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  user: { fontFamily: "Inter_400Regular", fontSize: 11 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 16, marginTop: 6 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  wanted: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 6, fontStyle: "italic" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cat: { fontFamily: "Inter_500Medium", fontSize: 12 },
  price: { fontFamily: "Fraunces_700Bold", fontSize: 16 },
  offerBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  offerBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 40 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: "Fraunces_600SemiBold", fontSize: 16 },
  modalAction: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  modalBody: { padding: 20, gap: 8, paddingBottom: 60 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 8 },
});
