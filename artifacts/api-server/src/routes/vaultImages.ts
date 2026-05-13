import { Router, type IRouter } from "express";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  collectionItemsTable,
  vaultItemImagesTable,
  type VaultItemImage,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  UploadVaultItemImageBody,
  PatchVaultItemImageBody,
} from "@workspace/api-zod";
import {
  categoryImageLimit,
  decodeBase64Image,
  deleteVaultImage,
  signVaultImageUrl,
  uploadVaultImage,
} from "../lib/storage";

const router: IRouter = Router();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function loadOwnedItem(
  itemId: number,
  userId: string,
): Promise<typeof collectionItemsTable.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(collectionItemsTable)
    .where(
      and(
        eq(collectionItemsTable.id, itemId),
        eq(collectionItemsTable.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function shapeImage(
  row: VaultItemImage,
): Promise<{
  id: string;
  vaultItemId: number;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
}> {
  const url = await signVaultImageUrl(row.storagePath);
  return {
    id: row.id,
    vaultItemId: row.vaultItemId,
    url,
    isPrimary: row.isPrimary,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get(
  "/vault-items/:itemId/images",
  requireAuth,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(itemId))
      return res.status(400).json({ error: "Invalid itemId" });
    const item = await loadOwnedItem(itemId, req.userId!);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const rows = await db
      .select()
      .from(vaultItemImagesTable)
      .where(eq(vaultItemImagesTable.vaultItemId, itemId))
      .orderBy(asc(vaultItemImagesTable.displayOrder));

    try {
      const out = await Promise.all(rows.map(shapeImage));
      return res.json(out);
    } catch (err) {
      req.log.error({ err }, "Sign vault image URLs failed");
      return res
        .status(502)
        .json({ error: "Failed to generate image URLs" });
    }
  },
);

router.post(
  "/vault-items/:itemId/images",
  requireAuth,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(itemId))
      return res.status(400).json({ error: "Invalid itemId" });

    const parsed = UploadVaultItemImageBody.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid request body" });

    const item = await loadOwnedItem(itemId, req.userId!);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const { bytes } = decodeBase64Image(parsed.data.imageBase64);
    if (bytes.byteLength > MAX_IMAGE_BYTES)
      return res
        .status(413)
        .json({ error: "Image exceeds 10MB limit" });

    const limit = categoryImageLimit(item.category);

    let storagePath: string;
    try {
      ({ storagePath } = await uploadVaultImage({
        userId: req.userId!,
        vaultItemId: itemId,
        imageBase64: parsed.data.imageBase64,
      }));
    } catch (err) {
      req.log.error({ err }, "Vault image upload to storage failed");
      return res.status(502).json({ error: "Storage upload failed" });
    }

    let inserted: VaultItemImage;
    try {
      inserted = await db.transaction(async (tx) => {
        // Lock the parent item row so concurrent uploads serialize on this item.
        await tx.execute(
          sql`select id from ${collectionItemsTable} where ${collectionItemsTable.id} = ${itemId} for update`,
        );

        const existing = await tx
          .select()
          .from(vaultItemImagesTable)
          .where(eq(vaultItemImagesTable.vaultItemId, itemId))
          .orderBy(asc(vaultItemImagesTable.displayOrder));

        if (existing.length >= limit) {
          throw Object.assign(new Error("LIMIT_REACHED"), {
            httpStatus: 422,
            httpMessage: `Photo limit reached for ${item.category} (${limit} max)`,
          });
        }

        const isFirst = existing.length === 0;
        const nextOrder =
          existing.reduce(
            (m: number, r: VaultItemImage) => Math.max(m, r.displayOrder),
            -1,
          ) + 1;

        const [row] = await tx
          .insert(vaultItemImagesTable)
          .values({
            vaultItemId: itemId,
            userId: req.userId!,
            storagePath,
            isPrimary: isFirst,
            displayOrder: nextOrder,
          })
          .returning();
        return row!;
      });
    } catch (err) {
      await deleteVaultImage(storagePath).catch(() => {});
      const httpStatus = (err as { httpStatus?: number })?.httpStatus;
      if (httpStatus) {
        return res.status(httpStatus).json({
          error:
            (err as { httpMessage?: string }).httpMessage ?? "Request failed",
        });
      }
      req.log.error({ err }, "Vault image DB insert failed");
      return res.status(500).json({ error: "Failed to record image" });
    }

    try {
      const shaped = await shapeImage(inserted);
      return res.status(201).json(shaped);
    } catch (err) {
      req.log.error({ err }, "Sign uploaded image URL failed");
      return res
        .status(502)
        .json({ error: "Image stored but URL signing failed" });
    }
  },
);

router.patch(
  "/vault-items/:itemId/images/:imageId",
  requireAuth,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    const imageId =
      typeof req.params.imageId === "string" ? req.params.imageId : "";
    if (!Number.isFinite(itemId) || !imageId)
      return res.status(400).json({ error: "Invalid itemId or imageId" });

    const parsed = PatchVaultItemImageBody.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid request body" });

    const item = await loadOwnedItem(itemId, req.userId!);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let updated: VaultItemImage;
    try {
      updated = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from ${collectionItemsTable} where ${collectionItemsTable.id} = ${itemId} for update`,
        );

        const [row] = await tx
          .select()
          .from(vaultItemImagesTable)
          .where(
            and(
              eq(vaultItemImagesTable.id, imageId),
              eq(vaultItemImagesTable.vaultItemId, itemId),
              eq(vaultItemImagesTable.userId, req.userId!),
            ),
          )
          .limit(1);
        if (!row) {
          throw Object.assign(new Error("NOT_FOUND"), {
            httpStatus: 404,
            httpMessage: "Image not found",
          });
        }

        // Prevent unsetting the only primary.
        if (parsed.data.isPrimary === false && row.isPrimary) {
          throw Object.assign(new Error("PRIMARY_REQUIRED"), {
            httpStatus: 422,
            httpMessage:
              "An item must have a primary photo. Promote another photo first.",
          });
        }

        // Atomically clear other primaries before setting this one.
        if (parsed.data.isPrimary === true) {
          await tx
            .update(vaultItemImagesTable)
            .set({ isPrimary: false })
            .where(
              and(
                eq(vaultItemImagesTable.vaultItemId, itemId),
                ne(vaultItemImagesTable.id, imageId),
              ),
            );
        }

        const updates: Partial<typeof vaultItemImagesTable.$inferInsert> = {};
        if (typeof parsed.data.isPrimary === "boolean")
          updates.isPrimary = parsed.data.isPrimary;
        if (typeof parsed.data.displayOrder === "number")
          updates.displayOrder = parsed.data.displayOrder;

        if (Object.keys(updates).length === 0) return row;

        const [next] = await tx
          .update(vaultItemImagesTable)
          .set(updates)
          .where(eq(vaultItemImagesTable.id, imageId))
          .returning();
        return next!;
      });
    } catch (err) {
      const httpStatus = (err as { httpStatus?: number })?.httpStatus;
      if (httpStatus) {
        return res.status(httpStatus).json({
          error:
            (err as { httpMessage?: string }).httpMessage ?? "Request failed",
        });
      }
      req.log.error({ err }, "Vault image PATCH failed");
      return res.status(500).json({ error: "Failed to update image" });
    }

    try {
      return res.json(await shapeImage(updated));
    } catch (err) {
      req.log.error({ err }, "Sign image URL after patch failed");
      return res.status(502).json({ error: "Failed to sign URL" });
    }
  },
);

router.delete(
  "/vault-items/:itemId/images/:imageId",
  requireAuth,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    const imageId =
      typeof req.params.imageId === "string" ? req.params.imageId : "";
    if (!Number.isFinite(itemId) || !imageId)
      return res.status(400).json({ error: "Invalid itemId or imageId" });

    const item = await loadOwnedItem(itemId, req.userId!);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let removedStoragePath: string | null = null;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from ${collectionItemsTable} where ${collectionItemsTable.id} = ${itemId} for update`,
        );

        const [row] = await tx
          .select()
          .from(vaultItemImagesTable)
          .where(
            and(
              eq(vaultItemImagesTable.id, imageId),
              eq(vaultItemImagesTable.vaultItemId, itemId),
              eq(vaultItemImagesTable.userId, req.userId!),
            ),
          )
          .limit(1);
        if (!row) {
          throw Object.assign(new Error("NOT_FOUND"), {
            httpStatus: 404,
            httpMessage: "Image not found",
          });
        }
        removedStoragePath = row.storagePath;

        await tx
          .delete(vaultItemImagesTable)
          .where(eq(vaultItemImagesTable.id, imageId));

        if (row.isPrimary) {
          const [next] = await tx
            .select()
            .from(vaultItemImagesTable)
            .where(eq(vaultItemImagesTable.vaultItemId, itemId))
            .orderBy(asc(vaultItemImagesTable.displayOrder))
            .limit(1);
          if (next) {
            await tx
              .update(vaultItemImagesTable)
              .set({ isPrimary: true })
              .where(eq(vaultItemImagesTable.id, next.id));
          }
        }
      });
    } catch (err) {
      const httpStatus = (err as { httpStatus?: number })?.httpStatus;
      if (httpStatus) {
        return res.status(httpStatus).json({
          error:
            (err as { httpMessage?: string }).httpMessage ?? "Request failed",
        });
      }
      req.log.error({ err }, "Vault image DELETE failed");
      return res.status(500).json({ error: "Failed to delete image" });
    }

    if (removedStoragePath) {
      try {
        await deleteVaultImage(removedStoragePath);
      } catch (err) {
        req.log.warn({ err }, "Vault image storage delete failed");
      }
    }

    return res.status(204).send();
  },
);

export default router;
