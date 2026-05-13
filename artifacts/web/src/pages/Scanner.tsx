import { useEffect, useRef, useState } from "react";
import {
  useCreateVaultItem,
  useRemoveBackground,
  useScannerAnalyze,
  type ScannerAnalyzeResult,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Upload,
  ScanLine,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type Mode = "standard" | "advanced";
type Category = "tcg" | "sports" | "lego";

const MODE_KEY = "grailbabe_scan_mode";
const MAX_DIM = 1200;
const JPEG_QUALITY = 0.85;

function loadMode(): Mode {
  if (typeof window === "undefined") return "standard";
  return window.localStorage.getItem(MODE_KEY) === "advanced"
    ? "advanced"
    : "standard";
}

async function dataUrlFromBlob(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function compressImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unsupported"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

export default function ScannerPage() {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [category, setCategory] = useState<Category>("tcg");
  const [itemId, setItemId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [result, setResult] = useState<ScannerAnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeBgMut = useRemoveBackground();
  const analyzeMut = useScannerAnalyze();

  useEffect(() => {
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const handleImageInput = async (file: File) => {
    if (images.length >= 6) {
      toast.error("Maximum 6 photos");
      return;
    }
    try {
      let dataUrl = await dataUrlFromBlob(file);

      if (category === "tcg" || category === "sports") {
        setBgRemoving(true);
        try {
          const res = await removeBgMut.mutateAsync({
            data: { imageBase64: dataUrl },
          });
          dataUrl = res.imageBase64;
        } catch {
          // silent fallback per spec
        } finally {
          setBgRemoving(false);
        }
      }

      const compressed = await compressImage(dataUrl);
      setImages((prev) => [...prev, compressed]);
    } catch {
      toast.error("Could not process image");
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleImageInput(f);
    e.target.value = "";
  };

  const runAnalyze = async () => {
    if (!itemId.trim()) {
      toast.error("Enter an item name or set number first");
      return;
    }
    setAnalyzeError(null);
    setResult(null);
    try {
      const useImages = mode === "advanced" ? images : [];
      const res = await analyzeMut.mutateAsync({
        data: {
          itemId: itemId.trim(),
          category,
          mode,
          imageBase64: useImages[0] ?? null,
          imageBase64s: useImages.length > 1 ? useImages.slice(1) : null,
        },
      });
      setResult(res);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Analysis failed",
      );
    }
  };

  const reset = () => {
    setResult(null);
    setImages([]);
    setAnalyzeError(null);
    setItemId("");
  };

  const primaryImage = images[0] ?? null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight flex items-center gap-2">
            <ScanLine className="size-7" style={{ color: "var(--neon-blue)" }} />
            Scanner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identify items, fetch market prices, and grade with AI.
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Category
            </div>
            <div className="inline-flex rounded-md border border-border p-1">
              {(
                [
                  { v: "tcg", label: "TCG cards" },
                  { v: "sports", label: "Sports cards" },
                  { v: "lego", label: "LEGO" },
                ] as { v: Category; label: string }[]
              ).map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => setCategory(c.v)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    category === c.v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {category === "lego" ? "Set number or name" : "Card name"}
            </div>
            <Input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder={
                category === "lego"
                  ? "e.g. 10300 or Back to the Future Time Machine"
                  : category === "tcg"
                    ? "e.g. Charizard or Black Lotus"
                    : "e.g. 1986 Topps Jordan #57"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") void runAnalyze();
              }}
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Photos ({images.length}/6) — front, back, corners, edges all help
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCameraOpen(true)}
                disabled={images.length >= 6}
              >
                <Camera className="size-4 mr-1.5" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 6}
              >
                <Upload className="size-4 mr-1.5" />
                Upload file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onFileChange}
              />
              {category === "lego" && (
                <span className="text-[10px] text-muted-foreground">
                  Background removal skipped for LEGO.
                </span>
              )}
              {mode === "advanced" && images.length === 1 && category !== "lego" && (
                <span className="text-[10px]" style={{ color: "var(--neon-yellow)" }}>
                  Add a back photo for higher confidence
                </span>
              )}
            </div>

            {(bgRemoving || images.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className="rounded-lg border border-border overflow-hidden bg-muted relative"
                      style={{ width: 110, height: 110 }}
                    >
                      <img
                        src={img}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                      {analyzeMut.isPending && <div className="scan-overlay" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 size-6 rounded-full bg-background border border-border grid place-items-center hover:bg-muted"
                      aria-label={`Remove photo ${idx + 1}`}
                    >
                      <X className="size-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-background/80 border border-border">
                      {idx === 0 ? "Front" : `#${idx + 1}`}
                    </div>
                  </div>
                ))}
                {bgRemoving && (
                  <div
                    className="rounded-lg border border-border bg-muted grid place-items-center"
                    style={{ width: 110, height: 110 }}
                  >
                    <div className="text-[10px] flex flex-col items-center gap-1">
                      <Loader2 className="size-4 animate-spin" />
                      Removing bg…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={runAnalyze}
              disabled={analyzeMut.isPending || bgRemoving}
            >
              {analyzeMut.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <ScanLine className="size-4 mr-1.5" />
              )}
              {mode === "advanced" ? "Run advanced analysis" : "Look up price"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyzeMut.isPending && (
        <ResultsSkeleton mode={mode} hasImage={images.length > 0} />
      )}

      {analyzeError && (
        <Card>
          <CardContent className="p-6 text-sm text-center space-y-3">
            <div className="text-red-400">{analyzeError}</div>
            <Button variant="outline" size="sm" onClick={runAnalyze}>
              <RefreshCw className="size-4 mr-1.5" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {result &&
        (mode === "standard" ? (
          <StandardResults
            result={result}
            image={primaryImage}
            images={images}
            category={category}
            onScanAnother={reset}
          />
        ) : (
          <AdvancedResults
            result={result}
            image={primaryImage}
            images={images}
            category={category}
            onScanAnother={reset}
          />
        ))}

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            void handleImageInput(file);
          }}
        />
      )}
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="inline-flex rounded-md border border-border p-1">
        {(["standard", "advanced"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`px-3 py-1.5 text-xs rounded capitalize transition-colors flex items-center gap-1 ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "advanced" && <Sparkles className="size-3" />}
            {m}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground max-w-[260px] text-right">
        {mode === "standard"
          ? "Quick lookup — barcode + current market prices"
          : "Full analysis — all price sources + AI photo grading"}
      </p>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function PriceTriple({ result }: { result: ScannerAnalyzeResult }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(
        [
          { label: "Low", v: result.priceRange.low, color: "var(--muted-foreground)" },
          { label: "Mid", v: result.priceRange.mid, color: "var(--neon-blue)" },
          { label: "High", v: result.priceRange.high, color: "var(--neon-green)" },
        ] as const
      ).map((b) => (
        <div
          key={b.label}
          className="rounded-md border border-border p-3 text-center"
        >
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
            {b.label}
          </div>
          <div
            className="font-serif text-xl mt-1"
            style={{ color: b.color }}
          >
            {fmt(b.v)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemHeader({
  result,
  image,
}: {
  result: ScannerAnalyzeResult;
  image: string | null;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="rounded-md border border-border bg-muted overflow-hidden shrink-0"
        style={{ width: 80, height: 80 }}
      >
        {image ? (
          <img
            src={image}
            alt={result.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ScanLine className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-xl truncate">{result.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {result.set ?? "Unknown set"}
          {result.year ? ` · ${result.year}` : ""}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {result.isMockData && (
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--neon-yellow) 60%, transparent)",
                color: "var(--neon-yellow)",
              }}
            >
              Mock data
            </Badge>
          )}
          {result.recentSoldCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {result.recentSoldCount} recent sales
            </Badge>
          )}
          {result.sources.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsActions({
  result,
  images,
  category,
  onScanAnother,
}: {
  result: ScannerAnalyzeResult;
  images: string[];
  category: Category;
  onScanAnother: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
      <Button variant="outline" size="sm" onClick={onScanAnother}>
        <X className="size-4 mr-1.5" />
        Dismiss
      </Button>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4 mr-1.5" />
        Commit to Vault
      </Button>
      <AddToVaultDialog
        open={open}
        onOpenChange={setOpen}
        result={result}
        images={images}
        category={category}
        onScanAnother={onScanAnother}
      />
    </div>
  );
}

const CONDITION_OPTIONS: Array<{
  value: "mint" | "near_mint" | "excellent" | "good" | "fair" | "poor";
  label: string;
}> = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

function vaultRouteForCategory(category: Category): string {
  if (category === "tcg") return "/vault/tcg";
  if (category === "lego") return "/vault/lego";
  return "/vault";
}

function gradeToCondition(
  grade: string | null | undefined,
): "mint" | "near_mint" | "excellent" | "good" | "fair" | "poor" {
  if (!grade) return "near_mint";
  const g = grade.toLowerCase();
  if (g.includes("gem") || g.includes("mint 10") || g === "10") return "mint";
  if (g.includes("near mint") || g.includes("nm") || g.includes("9")) return "near_mint";
  if (g.includes("excellent") || g.includes("ex") || g.includes("8") || g.includes("7")) return "excellent";
  if (g.includes("good") || g.includes("vg") || g.includes("6") || g.includes("5")) return "good";
  if (g.includes("fair") || g.includes("4") || g.includes("3")) return "fair";
  return "poor";
}

function AddToVaultDialog({
  open,
  onOpenChange,
  result,
  images,
  category,
  onScanAnother,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: ScannerAnalyzeResult;
  images: string[];
  category: Category;
  onScanAnother: () => void;
}) {
  const [, navigate] = useLocation();
  const createMut = useCreateVaultItem();
  const [name, setName] = useState(result.name);
  const [condition, setCondition] = useState(gradeToCondition(result.aiGrade));
  const [currentValue, setCurrentValue] = useState(
    String(result.priceRange.mid.toFixed(2)),
  );

  useEffect(() => {
    if (open) {
      setName(result.name);
      setCondition(gradeToCondition(result.aiGrade));
      setCurrentValue(String(result.priceRange.mid.toFixed(2)));
    }
  }, [open, result]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    const value = Number(currentValue);
    const notesParts: string[] = [];
    if (result.set) notesParts.push(`Set: ${result.set}`);
    if (result.year) notesParts.push(`Year: ${result.year}`);
    if (result.aiGrade) notesParts.push(`AI grade: ${result.aiGrade}`);
    if (result.aiGradeRange) notesParts.push(`Range: ${result.aiGradeRange}`);
    notesParts.push(
      `Scanner price range: $${result.priceRange.low.toFixed(2)} – $${result.priceRange.high.toFixed(2)} (mid $${result.priceRange.mid.toFixed(2)})`,
    );

    createMut.mutate(
      {
        data: {
          name: trimmed,
          category,
          condition,
          currentValue: Number.isFinite(value) ? value : result.priceRange.mid,
          photos: images,
          notes: notesParts.join("\n"),
        },
      },
      {
        onSuccess: () => {
          toast.success("Added to your Vault");
          onOpenChange(false);
          onScanAnother();
          navigate(vaultRouteForCategory(category));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add to vault");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Commit to Vault</DialogTitle>
          <DialogDescription>
            Save this scanned item to your collection. You can edit any details later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Condition</label>
            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as typeof condition)
              }
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Current value (USD)
            </label>
            <Input
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              className="mt-1"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Pre-filled from scanner mid price.
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {images.length} photo{images.length === 1 ? "" : "s"} will be saved
            with this item.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="size-4 mr-1.5" />
            )}
            Add to Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StandardResults({
  result,
  image,
  images,
  category,
  onScanAnother,
}: {
  result: ScannerAnalyzeResult;
  image: string | null;
  images: string[];
  category: Category;
  onScanAnother: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <ItemHeader result={result} image={image} />
        <PriceTriple result={result} />
        <ResultsActions
          result={result}
          images={images}
          category={category}
          onScanAnother={onScanAnother}
        />
      </CardContent>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Price history not available
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 320;
  const h = 60;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        stroke="var(--neon-blue)"
        strokeWidth={1.5}
        points={pts}
      />
    </svg>
  );
}

function AdvancedResults({
  result,
  image,
  images,
  category,
  onScanAnother,
}: {
  result: ScannerAnalyzeResult;
  image: string | null;
  images: string[];
  category: Category;
  onScanAnother: () => void;
}) {
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);
  const hasAi = Boolean(result.aiGrade) && !result.aiError;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <ItemHeader result={result} image={image} />

        {result.aiError && !aiBannerDismissed && (
          <div className="rounded-md p-3 flex items-start justify-between gap-3 border"
            style={{
              borderColor: "color-mix(in srgb, var(--neon-yellow) 40%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--neon-yellow) 10%, transparent)",
            }}>
            <div className="text-xs">
              <div className="font-medium">AI analysis unavailable</div>
              <div className="text-muted-foreground mt-0.5">
                {result.aiErrorReason ?? "AI grading could not run."}
              </div>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setAiBannerDismissed(true)}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <Accordion type="multiple" defaultValue={["ai", "market"]}>
          <AccordionItem value="ai">
            <AccordionTrigger
              className="hover:no-underline"
              style={{ color: "var(--neon-blue)" }}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Grade Analysis
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {!hasAi ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  {image
                    ? "AI grading not available for this scan."
                    : "Capture or upload a photo to get an AI grade."}
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Estimated grade
                      </div>
                      <div className="font-serif text-3xl" style={{ color: "var(--neon-blue)" }}>
                        {result.aiGradeRange ?? result.aiGrade}
                      </div>
                    </div>
                    {result.aiConfidence && (
                      <Badge
                        variant="outline"
                        className="text-[10px] mb-1.5"
                        style={{
                          borderColor:
                            result.aiConfidence === "high"
                              ? "color-mix(in srgb, var(--neon-green) 60%, transparent)"
                              : result.aiConfidence === "low"
                                ? "color-mix(in srgb, var(--neon-yellow) 60%, transparent)"
                                : undefined,
                          color:
                            result.aiConfidence === "high"
                              ? "var(--neon-green)"
                              : result.aiConfidence === "low"
                                ? "var(--neon-yellow)"
                                : undefined,
                        }}
                      >
                        {result.aiConfidence} confidence
                      </Badge>
                    )}
                    {result.marketImpliedGrade && result.aiGrade && (
                      <div className="text-[10px] text-muted-foreground mb-1.5">
                        Market implies <span className="text-foreground">{result.marketImpliedGrade}</span>
                      </div>
                    )}
                  </div>
                  {result.aiSubGrades && (
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { label: "Centering", v: result.aiSubGrades.centering },
                          { label: "Corners", v: result.aiSubGrades.corners },
                          { label: "Edges", v: result.aiSubGrades.edges },
                          { label: "Surface", v: result.aiSubGrades.surface },
                        ] as const
                      ).map((s) => (
                        <div
                          key={s.label}
                          className="rounded-md border border-border p-2 text-center"
                        >
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                            {s.label}
                          </div>
                          <div className="font-serif text-lg mt-0.5">
                            {s.v ? s.v.toFixed(1) : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.aiReasoning && (
                    <div className="text-xs text-muted-foreground italic border-l-2 pl-3"
                      style={{ borderColor: "var(--neon-blue)" }}>
                      {result.aiReasoning}
                    </div>
                  )}
                  {result.defects.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        Defects
                      </div>
                      <ul className="text-xs list-disc pl-5 space-y-0.5">
                        {result.defects.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.centering && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        Centering
                      </div>
                      <div className="text-xs">{result.centering}</div>
                    </div>
                  )}
                  {result.surfaceNotes && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        Surface
                      </div>
                      <div className="text-xs">{result.surfaceNotes}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {result.authenticityOk === false ||
                    result.authenticityFlags.length > 0 ? (
                      <>
                        <ShieldAlert
                          className="size-4"
                          style={{ color: "var(--neon-yellow)" }}
                        />
                        <div className="text-xs">
                          <span style={{ color: "var(--neon-yellow)" }}>
                            Authenticity check:
                          </span>{" "}
                          {result.authenticityFlags.join("; ") ||
                            "Possible concerns"}
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck
                          className="size-4"
                          style={{ color: "var(--neon-green)" }}
                        />
                        <div
                          className="text-xs"
                          style={{ color: "var(--neon-green)" }}
                        >
                          No authenticity concerns
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="market">
            <AccordionTrigger className="hover:no-underline">
              Market Data
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 py-2">
                <PriceTriple result={result} />
                {result.extendedPrices.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.extendedPrices.map((p, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border p-3"
                      >
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {p.label}
                        </div>
                        <div className="font-serif text-base mt-1">
                          {p.value}
                        </div>
                        {p.note && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {p.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {result.priceLadder && result.priceLadder.length > 0 && (
            <AccordionItem value="ladder">
              <AccordionTrigger className="hover:no-underline">
                Price by Grade
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-2 space-y-2">
                  <div className="text-[10px] text-muted-foreground">
                    What the same card is typically worth at each PSA grade.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {result.priceLadder.map((rung) => {
                      const matchesAi =
                        result.aiGrade && rung.grade.includes(result.aiGrade.replace(/^PSA\s*/i, ""));
                      const matchesMarket = rung.grade === result.marketImpliedGrade;
                      return (
                        <div
                          key={rung.grade}
                          className="rounded-md border p-2 text-center"
                          style={{
                            borderColor: matchesAi
                              ? "var(--neon-blue)"
                              : matchesMarket
                                ? "color-mix(in srgb, var(--neon-green) 60%, transparent)"
                                : "var(--border)",
                          }}
                        >
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                            {rung.grade}
                          </div>
                          <div className="font-serif text-base mt-0.5">
                            {fmt(rung.price)}
                          </div>
                          {(matchesAi || matchesMarket) && (
                            <div className="text-[9px] mt-0.5"
                              style={{ color: matchesAi ? "var(--neon-blue)" : "var(--neon-green)" }}>
                              {matchesAi ? "AI grade" : "Market"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="history">
            <AccordionTrigger className="hover:no-underline">
              Price History
            </AccordionTrigger>
            <AccordionContent>
              <div className="py-2">
                <Sparkline values={result.priceHistorySparkline} />
                {result.priceHistorySparkline.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Last 6 months (illustrative)
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <ResultsActions
          result={result}
          images={images}
          category={category}
          onScanAnother={onScanAnother}
        />
      </CardContent>
    </Card>
  );
}

function ResultsSkeleton({
  mode,
  hasImage,
}: {
  mode: Mode;
  hasImage: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="size-20 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" />
          Fetching prices…
        </div>
        {mode === "advanced" && hasImage && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            AI analyzing photo…
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function CameraCapture({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError("Camera unavailable. Try uploading a file instead.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg p-4 max-w-lg w-full space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-serif text-lg">Take a photo</div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        {error ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full rounded-md bg-black aspect-video object-contain"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={snap} disabled={Boolean(error)}>
            <Camera className="size-4 mr-1.5" />
            Capture
          </Button>
        </div>
      </div>
    </div>
  );
}
