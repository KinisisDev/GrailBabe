import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashGate } from "@/components/SplashGate";
import { tokenCache } from "@/lib/tokenCache";
import { configureApi } from "@/lib/api";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function ApiBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  useEffect(() => {
    configureApi(async () => {
      try {
        if (!isLoaded) return null;
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken, isLoaded]);
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0f" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="grail" />
      <Stack.Screen name="trades" />
      <Stack.Screen name="my-trades" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="security/index" />
      <Stack.Screen name="security/rules" />
      <Stack.Screen name="security/legal" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen name="vault/add" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const tree = !PUBLISHABLE_KEY ? (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
              {!splashDone && <SplashGate onEnter={() => setSplashDone(true)} />}
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  ) : (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <ApiBridge>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                  {!splashDone && <SplashGate onEnter={() => setSplashDone(true)} />}
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ApiBridge>
        </ClerkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );

  return tree;
}
