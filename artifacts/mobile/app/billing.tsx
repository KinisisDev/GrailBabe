import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useListBillingPlans, useGetMe } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { useIsSignedIn, SignInPrompt } from "@/components/AuthGate";
import { getApiBaseUrl, qopt } from "@/lib/api";

export default function BillingScreen() {
  const colors = useColors();
  const { getToken } = useAuth();
  const { isSignedIn } = useIsSignedIn();
  const { data: plans, isLoading } = useListBillingPlans();
  const { data: me } = useGetMe(qopt(isSignedIn));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const tier = me?.subscription.tier ?? "free";

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

  return (
    <PageShell title="Billing">
      {!isSignedIn && <SignInPrompt message="Sign in to manage your subscription." />}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Current plan</Text>
        <Text style={[styles.tier, { color: tier === "premium" ? colors.neonYellow : colors.foreground }]}>
          {tier === "premium" ? "★ Premium" : "Free"}
        </Text>
        {isSignedIn && tier === "premium" && (
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
              <Text style={[styles.btnText, { color: colors.foreground }]}>Manage in Stripe portal</Text>
            )}
          </Pressable>
        )}
      </View>

      {isLoading && <ActivityIndicator color={colors.neonGreen} style={{ marginTop: 24 }} />}

      <View style={styles.plans}>
        {(plans ?? []).map((p) => (
          <View key={p.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.planName, { color: colors.foreground }]}>{p.name}</Text>
            <Text style={[styles.planPrice, { color: colors.neonGreen }]}>
              ${(p.priceCents / 100).toFixed(0)}
              <Text style={[styles.planInterval, { color: colors.mutedForeground }]}>
                {p.interval === "none" ? "" : ` /${p.interval}`}
              </Text>
            </Text>
            <View style={styles.featureList}>
              {p.features.map((f, i) => (
                <View key={i} style={styles.feature}>
                  <Feather name="check" size={14} color={colors.neonGreen} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>
            {isSignedIn && p.tier !== tier && (
              <Pressable
                onPress={() => open("checkout", { planId: p.id })}
                disabled={busy === "checkout"}
                style={({ pressed }) => [
                  styles.upgradeBtn,
                  { backgroundColor: colors.neonGreen, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {busy === "checkout" ? (
                  <ActivityIndicator color="#0a0a0f" />
                ) : (
                  <Text style={[styles.upgradeText]}>
                    {p.tier === "premium" ? "Upgrade" : "Downgrade"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {err && <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 11 },
  tier: { fontFamily: "Fraunces_700Bold", fontSize: 26, marginTop: 4 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  plans: { paddingHorizontal: 16, gap: 12, marginTop: 4 },
  planCard: { padding: 16, borderRadius: 14, borderWidth: 1 },
  planName: { fontFamily: "Fraunces_600SemiBold", fontSize: 18 },
  planPrice: { fontFamily: "Fraunces_700Bold", fontSize: 28, marginTop: 4 },
  planInterval: { fontFamily: "Inter_500Medium", fontSize: 14 },
  featureList: { marginTop: 12, gap: 6 },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  upgradeBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  upgradeText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#0a0a0f" },
  err: { fontFamily: "Inter_500Medium", fontSize: 13, padding: 16, textAlign: "center" },
});
