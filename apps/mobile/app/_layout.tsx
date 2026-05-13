import { Stack } from 'expo-router';

export default function RootLayout() {
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
