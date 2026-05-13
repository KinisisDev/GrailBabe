/**
 * usePushNotifications
 *
 * Registers the device for push notifications on first mount.
 * - Requests permission via expo-notifications
 * - Gets the Expo push token
 * - POSTs to /api/push/register
 * - Stores deep-link navigation on foreground/background notifications
 *
 * Requires expo-notifications to be installed:
 *   npx expo install expo-notifications expo-device
 */
import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
const DEV_BYPASS = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

export function usePushNotifications(clerkId?: string) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const register = useCallback(async (id: string) => {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    try {
      await fetch(`${WEB_URL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_id: id, token: tokenData.data, enabled: true }),
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    const id = DEV_BYPASS ? 'dev_user' : clerkId;
    if (!id) return;
    register(id);
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'trade_match') router.push('/trades');
      else if (data?.type === 'message') router.push('/messages');
    });
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [clerkId, register]);
}
