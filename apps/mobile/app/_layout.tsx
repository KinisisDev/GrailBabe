/**
 * Root layout — wires up push notification registration on app launch.
 * Uses DEV_BYPASS_AUTH=true during development to skip Clerk auth.
 */
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

export default function RootLayout() {
  // Register for push on launch
  // In production, pass the real Clerk user id here
  usePushNotifications(DEV_BYPASS ? 'dev_user' : undefined);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scanner" options={{ presentation: 'modal' }} />
      <Stack.Screen name="vault/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="trades" options={{ presentation: 'card' }} />
      <Stack.Screen name="messages/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
