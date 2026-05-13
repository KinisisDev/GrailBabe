import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const VAULT_BUCKET = "vault-items";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

let _client: SupabaseClient | null = null;

export function storageClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
    );
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function decodeBase64Image(input: string): {
  bytes: Buffer;
  contentType: string;
} {
  const m = input.match(/^data:(image\/[a-z+]+);base64,(.*)$/i);
  const contentType = m ? m[1]!.toLowerCase() : "image/jpeg";
  const data = m ? m[2]! : input;
  return { bytes: Buffer.from(data, "base64"), contentType };
}

export async function uploadVaultImage(opts: {
  userId: string;
  vaultItemId: number;
  imageBase64: string;
}): Promise<{ storagePath: string }> {
  const { bytes, contentType } = decodeBase64Image(opts.imageBase64);
  const ext = contentType === "image/png" ? "png" : "jpg";
  const id = crypto.randomUUID();
  const storagePath = `${opts.userId}/${opts.vaultItemId}/${id}.${ext}`;
  const { error } = await storageClient()
    .storage.from(VAULT_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { storagePath };
}

export async function deleteVaultImage(storagePath: string): Promise<void> {
  const { error } = await storageClient()
    .storage.from(VAULT_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function signVaultImageUrl(
  storagePath: string,
): Promise<string> {
  const { data, error } = await storageClient()
    .storage.from(VAULT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl)
    throw new Error(
      `Sign URL failed: ${error?.message ?? "unknown error"}`,
    );
  return data.signedUrl;
}

export function categoryImageLimit(category: string): number {
  const c = category.trim().toLowerCase();
  if (c.includes("lego")) return 5;
  if (c.includes("tcg")) return 2;
  if (c.includes("sport")) return 2;
  return 5;
}
