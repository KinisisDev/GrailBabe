import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVaultItemImages,
  useUploadVaultItemImage,
  useDeleteVaultItemImage,
  usePatchVaultItemImage,
  getListVaultItemImagesQueryKey,
  type VaultItemImage,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  itemId: number;
  category: string;
  readOnly?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;

function categoryLimit(category: string): number {
  const c = category.toLowerCase();
  if (c.includes("lego")) return 5;
  if (c.includes("tcg")) return 2;
  if (c.includes("sport")) return 2;
  return 5;
}

function isLego(category: string): boolean {
  return category.toLowerCase().includes("lego");
}

async function compressFile(file: File, category: string): Promise<string> {
  const isLegoCat = isLego(category);
  const maxDim = isLegoCat ? 1600 : 1200;
  const quality = isLegoCat ? 0.8 : 0.85;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unsupported"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

export function VaultItemImages({ itemId, category, readOnly }: Props) {
  const qc = useQueryClient();
  const queryKey = getListVaultItemImagesQueryKey(itemId);
  const invalidate = () => qc.invalidateQueries({ queryKey });

  const { data: images, isLoading, isError } = useListVaultItemImages(itemId);
  const uploadMut = useUploadVaultItemImage({
    mutation: { onSuccess: invalidate },
  });
  const deleteMut = useDeleteVaultItemImage({
    mutation: { onSuccess: invalidate },
  });
  const patchMut = usePatchVaultItemImage({
    mutation: { onSuccess: invalidate },
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const limit = categoryLimit(category);
  const count = images?.length ?? 0;
  const atLimit = count >= limit;
  const cols = isLego(category)
    ? "grid-cols-2 sm:grid-cols-3"
    : "grid-cols-2";

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    try {
      const imageBase64 = await compressFile(file, category);
      await uploadMut.mutateAsync({ itemId, data: { imageBase64 } });
      toast.success("Photo uploaded");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const onSetPrimary = async (img: VaultItemImage) => {
    if (img.isPrimary || readOnly) return;
    setPendingId(img.id);
    try {
      await patchMut.mutateAsync({
        itemId,
        imageId: img.id,
        data: { isPrimary: true },
      });
    } catch {
      toast.error("Could not set as primary");
    } finally {
      setPendingId(null);
    }
  };

  const onDelete = async (img: VaultItemImage) => {
    if (!confirm("Delete this photo?")) return;
    setPendingId(img.id);
    try {
      await deleteMut.mutateAsync({ itemId, imageId: img.id });
      toast.success("Photo deleted");
    } catch {
      toast.error("Could not delete photo");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="font-serif">Photos</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {count} / {limit}
          </span>
          {!readOnly && !atLimit && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                Add photo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onSelect}
              />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={`grid ${cols} gap-3`}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Could not load photos.
          </div>
        ) : count === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center flex flex-col items-center gap-2">
            <Camera className="size-8 opacity-40" />
            <div>
              No photos yet.
              {!readOnly && atLimit ? "" : !readOnly ? " Add one above." : ""}
            </div>
          </div>
        ) : (
          <div className={`grid ${cols} gap-3`}>
            {(images ?? []).map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-md overflow-hidden border border-border bg-muted group"
              >
                <button
                  type="button"
                  onClick={() => void onSetPrimary(img)}
                  className="absolute inset-0 w-full h-full"
                  aria-label={img.isPrimary ? "Primary photo" : "Set as primary"}
                  disabled={readOnly || img.isPrimary}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                {img.isPrimary && (
                  <Badge
                    variant="default"
                    className="absolute top-1.5 left-1.5 text-[10px] flex items-center gap-1"
                  >
                    <Star className="size-3 fill-current" />
                    Primary
                  </Badge>
                )}
                {pendingId === img.id && (
                  <div className="absolute inset-0 grid place-items-center bg-background/60">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => void onDelete(img)}
                    className="absolute top-1.5 right-1.5 size-7 rounded-full bg-background/90 border border-border grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
