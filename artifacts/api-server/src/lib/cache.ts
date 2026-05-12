import redis from "./redis";

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl = DEFAULT_TTL,
): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache del error:", error);
  }
}

export const CacheKeys = {
  grailItem: (itemId: string) => `grailbabe:item:${itemId}`,
  userCollection: (userId: string) => `grailbabe:collection:${userId}`,
  marketPrice: (itemId: string) => `grailbabe:price:${itemId}`,
  aiInsights: (userId: string, itemId: string) =>
    `grailbabe:ai:${userId}:${itemId}`,
};
