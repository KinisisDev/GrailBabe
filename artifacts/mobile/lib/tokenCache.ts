import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { TokenCache } from "@clerk/clerk-expo/dist/cache";

const webCache: Record<string, string> = {};

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === "web") {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(key) ?? webCache[key] ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, value);
        }
        webCache[key] = value;
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* swallow */
    }
  },
  async clearToken(key: string) {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(key);
        }
        delete webCache[key];
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* swallow */
    }
  },
};
