import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useAuth } from "@/lib/auth/entraAuthContext";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import {
  useListBillingPlans,
  useGetMe,
  type BillingPlan,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { getApiBaseUrl, qopt } from "@/lib/api";

type Interval = "month" | "year";
type TierKey = "scout" | "seeker" | "master";

const SCOUT_FEATURES = [
  "Track up to 25 vault items",
  "Up to 10 grail picks",
  "Browse the community",
];

const SEEKER_FEATURES = [
  "Unlimited vault items",
  "Unlimited grail list",
  "AI scanner & live pricing",
  "Priority trade matching",
];

const MASTER_FEATURES = [
  "Everything in Seeker",
  "AI portfolio insights",
  "Advanced analytics & exports",
  "Concierge trade support",
];

const TIERS: {
  key: TierKey;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  {
    key: "scout",
    name: "Grail Scout",
    tagline: "Start tracking your collection",
    monthly: 0,
    yearly: 0,
    features: SCOUT_FEATURES,
    icon: "compass",
  },
  {
    key: "seeker",
    name: "Grail Seeker",
    tagline: "For active collectors",
    monthly: 12.99,
    yearly: 109,
    features: SEEKER_FEATURES,
    highlight: true,
    icon: "star",
  },
  {
    key: "master",
    name: "Grail Master",
    tagline: "For serious collectors",
    monthly: 24.99,
    yearly: 199,
    features: MASTER_FEATURES,
    icon: "award",
  },
];

function annualSavings(monthly: number, yearly: number): number {
  if (monthly <= 0 || yearly <= 0) return 0;
  return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
}

export default function BillingScreen() {
  const colors = useColors();
  const { getToken } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const { data: plans, isLoading } = useListBillingPlans();
  const { data: me } = useGetMe(qopt(isSignedIn));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [interval, setIntervalState] = useState<Interval>("year");

  const isPremium = me?.profile.tier === "premium";
  const currentInterval = me?.subscription.interval ?? null;
  const currentTier: TierKey = isPremium
    ? currentInterval === "year"
      ? "master"
      : "seeker"
    : "scout";

  const stripePlans: Record<
    "seeker" | "master",
    Record<Interval, BillingPlan | undefined>
  > = useMemo(() => {
    const list = plans ?? [];
    return {
      seeker: {
        month: list.find((p) => p.tier === "seeker" && p.interval === "month"),
        year: list.find((p) => p.tier === "seeker" && p.interval === "year"),
      },
      master: {
        month: list.find((p) => p.tier === "master" && p.interval === "month"),
        year: list.find((p) => p.tier === "master" && p.interval === "year"),
      },
    };
  }, [plans]);

  const open = useCallback(
    async (path: "checkout" | "portal", body?: object) => {
      if (!isSignedIn) return;
      setBusy(path);
      setErr(null);
      try {
        const token = await getToken();
        const base = Platform.OS === "web" ? "" : (getApiBaseUrl() ?? "");
        const res = await fetch(`${base}/api/billing/${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = (await res.json()) as { url: string };
        if (Platform.OS === "web") {
          if (typeof window !== "undefined") window.location.href = json.url;
        } else {
          await WebBrowser.openBrowserAsync(json.url);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [getToken, isSignedIn],
  );

  const seekerSavings = annualSavings(12.99, 109);
  const masterSavings = annualSavings(24.99, 199);
  const headlineSavings = Math.max(seekerSavings, masterSavings);

  return (
    <PageShell title="Billing">
      {!isSignedIn && (
        <SignInPrompt message="Sign in to manage your subscription." />
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Current plan
        </Text>
        <Text
          style={[
            styles.tier,
            {
              color:
                currentTier === "master"
                  ? colors.neonYellow
                  : currentTier === "seeker"
                    ? colors.neonGreen
                    : colors.foreground,
            },
          ]}
        >
          {currentTier === "master"
            ? "★ Grail Master"
            : currentTier === "seeker"
              ? "★ Grail Seeker"
              : "Grail Scout"}
        </Text>
        {isSignedIn && isPremium && (
          <Pressable
            onPress={() => open("portal")}
            disabled={busy === "portal"}
            style={({ pressed }) => [
              styles.btn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {busy === "portal" ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text style={[styles.btnText, { color: colors.foreground }]}>
                Manage in Stripe portal
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Interval toggle */}
      <View style={[styles.toggleRow]}>
        <View
          style={[
            styles.toggle,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setIntervalState("month")}
            style={[
              styles.toggleBtn,
              interval === "month" && {
                backgroundColor: colors.neonGreen,
              },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    interval === "month" ? "#0a0a0f" : colors.foreground,
                },
              ]}
            >
              Monthly
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIntervalState("year")}
            style={[
              styles.toggleBtn,
              interval === "year" && {
                backgroundColor: colors.neonGreen,
              },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: interval === "year" ? "#0a0a0f" : colors.foreground,
                },
              ]}
            >
              Yearly
              {interval === "year" && headlineSavings > 0 && (
                <Text style={{ fontFamily: "Inter_500Medium" }}>
                  {`  · save ${headlineSavings}%`}
                </Text>
              )}
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading && (
        <ActivityIndicator color={colors.neonGreen} style={{ marginTop: 24 }} />
      )}

      <View style={styles.plans}>
        {TIERS.map((tier) => {
          const stripePlan =
            tier.key === "seeker"
              ? stripePlans.seeker[interval]
              : tier.key === "master"
                ? stripePlans.master[interval]
                : undefined;
          const price = interval === "month" ? tier.monthly : tier.yearly;
          const isCurrent = tier.key === currentTier;
          const isFree = tier.key === "scout";
          const showCheckout =
            isSignedIn && !isCurrent && !isFree && !isPremium && Boolean(stripePlan);
          const showPortalSwitch =
            isSignedIn && !isCurrent && !isFree && isPremium;

          return (
            <View
              key={tier.key}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: tier.highlight
                    ? colors.neonGreen
                    : colors.border,
                  borderWidth: tier.highlight ? 2 : 1,
                },
              ]}
            >
              {tier.highlight && (
                <View
                  style={[
                    styles.popBadge,
                    { backgroundColor: colors.neonGreen },
                  ]}
                >
                  <Text style={styles.popText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Feather
                  name={tier.icon}
                  size={18}
                  color={tier.highlight ? colors.neonGreen : colors.foreground}
                />
                <Text
                  style={[styles.planName, { color: colors.foreground }]}
                >
                  {tier.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.planTagline,
                  { color: colors.mutedForeground },
                ]}
              >
                {tier.tagline}
              </Text>
              <Text style={[styles.planPrice, { color: colors.neonGreen }]}>
                {isFree
                  ? "Free"
                  : `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`}
                {!isFree && (
                  <Text
                    style={[
                      styles.planInterval,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {interval === "month" ? " /mo" : " /yr"}
                  </Text>
                )}
              </Text>
              <View style={styles.featureList}>
                {tier.features.map((f, i) => (
                  <View key={i} style={styles.feature}>
                    <Feather
                      name="check"
                      size={14}
                      color={colors.neonGreen}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        { color: colors.foreground },
                      ]}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
              {isCurrent && (
                <View
                  style={[
                    styles.currentBadge,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.currentText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Current plan
                  </Text>
                </View>
              )}
              {showCheckout && stripePlan && (
                <Pressable
                  onPress={() =>
                    open("checkout", { planId: stripePlan.id })
                  }
                  disabled={busy === "checkout"}
                  style={({ pressed }) => [
                    styles.upgradeBtn,
                    {
                      backgroundColor: tier.highlight
                        ? colors.neonGreen
                        : colors.foreground,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {busy === "checkout" ? (
                    <ActivityIndicator color="#0a0a0f" />
                  ) : (
                    <Text style={styles.upgradeText}>
                      {isPremium ? "Switch plan" : "Upgrade"}
                    </Text>
                  )}
                </Pressable>
              )}
              {showPortalSwitch && (
                <Pressable
                  onPress={() => open("portal")}
                  disabled={busy === "portal"}
                  style={({ pressed }) => [
                    styles.upgradeBtn,
                    {
                      backgroundColor: tier.highlight
                        ? colors.neonGreen
                        : colors.foreground,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {busy === "portal" ? (
                    <ActivityIndicator color="#0a0a0f" />
                  ) : (
                    <Text style={styles.upgradeText}>
                      Switch in Stripe portal
                    </Text>
                  )}
                </Pressable>
              )}
              {isFree && !isCurrent && (
                <View
                  style={[
                    styles.currentBadge,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.currentText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Always available
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {err && (
        <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 11 },
  tier: { fontFamily: "Fraunces_700Bold", fontSize: 26, marginTop: 4 },
  btn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  toggleRow: { paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  toggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 7,
    alignItems: "center",
  },
  toggleText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  plans: { paddingHorizontal: 16, gap: 12, marginTop: 4 },
  planCard: { padding: 16, borderRadius: 14, position: "relative" },
  popBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  popText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#0a0a0f",
    letterSpacing: 0.5,
  },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontFamily: "Fraunces_600SemiBold", fontSize: 18 },
  planTagline: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  planPrice: { fontFamily: "Fraunces_700Bold", fontSize: 28, marginTop: 8 },
  planInterval: { fontFamily: "Inter_500Medium", fontSize: 14 },
  featureList: { marginTop: 12, gap: 6 },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  upgradeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  upgradeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#0a0a0f",
  },
  currentBadge: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  currentText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  err: {
    marginHorizontal: 16,
    marginTop: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
