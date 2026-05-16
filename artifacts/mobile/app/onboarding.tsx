import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/entraAuthContext";
import { useCheckScreenname } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { PageShell } from "@/components/PageShell";
import { qopt } from "@/lib/api";

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const [screenname, setScreenname] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("US");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const trimmed = screenname.trim().toLowerCase();
  const { data: avail, isFetching: checking } = useCheckScreenname(
    { screenname: trimmed },
    qopt(trimmed.length >= 3),
  );

  const submit = useCallback(async () => {
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!trimmed || !city) {
      setErr("Screenname and city are required.");
      return;
    }
    if (avail && (!avail.available || !avail.valid)) {
      setErr(avail.reason ?? "That screenname isn't available.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      const res = await fetch(
        Platform.OS === "web"
          ? "/api/profiles"
          : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/profiles`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ screenname: trimmed, city, country }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || "Failed to create profile");
      }
      router.replace("/");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [isSignedIn, trimmed, city, country, avail, getToken, router]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
  ];

  const status =
    trimmed.length < 3
      ? null
      : checking
        ? "Checking…"
        : avail?.available && avail.valid
          ? "Available"
          : avail?.reason ?? "Not available";

  return (
    <PageShell title="Welcome">
      <View style={styles.body}>
        <Text style={[styles.h, { color: colors.foreground }]}>Set up your collector profile</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Pick a screenname and tell us where you collect from.
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Screenname</Text>
        <TextInput
          style={inputStyle}
          value={screenname}
          onChangeText={setScreenname}
          autoCapitalize="none"
          placeholder="grailhunter"
          placeholderTextColor={colors.mutedForeground}
        />
        {status && (
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              color:
                avail?.available && avail.valid
                  ? colors.neonGreen
                  : checking
                    ? colors.mutedForeground
                    : colors.destructive,
              marginTop: 4,
            }}
          >
            {status}
          </Text>
        )}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>City</Text>
        <TextInput
          style={inputStyle}
          value={city}
          onChangeText={setCity}
          placeholder="Brooklyn"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Country (2-letter)</Text>
        <TextInput
          style={inputStyle}
          value={country}
          onChangeText={(v) => setCountry(v.toUpperCase().slice(0, 2))}
          autoCapitalize="characters"
          maxLength={2}
          placeholder="US"
          placeholderTextColor={colors.mutedForeground}
        />

        {err && <Text style={[styles.err, { color: colors.destructive }]}>{err}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.neonBlue, opacity: busy || pressed ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Continue</Text>
          )}
        </Pressable>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 8 },
  h: { fontFamily: "Fraunces_700Bold", fontSize: 24, marginBottom: 4 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 16 },
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
  btn: { marginTop: 20, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
