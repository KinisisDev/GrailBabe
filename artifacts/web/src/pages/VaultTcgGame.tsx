import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVaultItems,
  useCreateVaultItem,
  useGetMe,
  type CollectionItem,
} from "@workspace/api-client-react";
import { useActiveTradeVaultItemIds } from "@/lib/activeTrades";
import { ListForTradeDialog } from "@/components/ListForTradeDialog";
import { ArrowLeftRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, conditionLabel, CONDITIONS } from "@/lib/format";
import {
  TCG_GAMES,
  TcgGameSlug,
  ItemType,
  tcgGameName,
  tcgCategory,
  isTcgGameCategory,
  categoryItemType,
  decodeNotes,
  encodeNotes,
  PAGE_SIZE,
  SortKey,
  sortItems,
} from "@/lib/vaultCategory";
import {
  VaultSearchBar,
  ImportExportButton,
} from "@/components/vault/VaultImportExport";

export default function VaultTcgGamePage({ game }: { game: string }) {
  const isValid = TCG_GAMES.some((g) => g.slug === game);
  const slug = game as TcgGameSlug;
  const [type, setType] = useState<ItemType>("single");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listItem, setListItem] = useState<CollectionItem | null>(null);
  const activeTradeIds = useActiveTradeVaultItemIds();
  const { data, isLoading } = useListVaultItems();
  const { data: me } = useGetMe();
  const isPro = (me?.profile.tier ?? "free") !== "free";

  const filtered = useMemo(() => {
    const all = (data ?? []).filter((i) => isTcgGameCategory(i.category, slug));
    const byType = all.filter((i) => categoryItemType(i.category) === type);
    const q = search.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter((i) => {
      const notes = decodeNotes(i.notes);
      return (
        i.name.toLowerCase().includes(q) ||
        (i.brand ?? "").toLowerCase().includes(q) ||
        (notes.cardNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, slug, type, search]);

  const sorted = useMemo(() => sortItems(filtered, sort), [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!isValid) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
        <Link href="/vault/tcg">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="size-4 mr-1" /> TCG
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="font-serif text-2xl">Game not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/vault/tcg">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2">
              <ArrowLeft className="size-4 mr-1" /> TCG
            </Button>
          </Link>
          <h1 className="font-serif text-3xl tracking-tight">{tcgGameName(slug)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sorted.length} {sorted.length === 1 ? type : `${type}s`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButton category="tcg" isPro={isPro} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1" /> Add {type === "single" ? "card" : "set"}
              </Button>
            </DialogTrigger>
            <AddTcgDialog
              game={slug}
              type={type}
              onClose={() => setOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-md border border-border p-0.5 bg-card">
          {(["set", "single"] as ItemType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={`px-4 py-1.5 text-sm rounded-[5px] capitalize transition-colors ${
                type === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "set" ? "Sets" : "Singles"}
            </button>
          ))}
        </div>
        <VaultSearchBar value={search} onChange={setSearch} tab={type} />
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="recent">Date added</SelectItem>
            <SelectItem value="value">Value (high to low)</SelectItem>
            <SelectItem value="condition">Condition</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="font-serif text-2xl">No {type}s yet</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add your first {tcgGameName(slug)}{" "}
              {type === "single" ? "card" : "sealed set"} to start tracking.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4 mr-1" /> Add {type === "single" ? "card" : "set"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pageItems.map((item) => {
              const notes = decodeNotes(item.notes);
              const isActive = activeTradeIds.has(item.id);
              return (
                <Link key={item.id} href={`/vault/${item.id}`}>
                  <Card className="h-full hover:border-primary/40 cursor-pointer transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="aspect-[3/4] rounded-md bg-muted/40 grid place-items-center text-xs text-muted-foreground relative">
                        No image
                        {isActive && (
                          <Badge
                            className="absolute top-2 left-2 text-[9px] uppercase tracking-wide"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--neon-yellow) 18%, transparent)",
                              color: "var(--neon-yellow)",
                              borderColor:
                                "color-mix(in srgb, var(--neon-yellow) 50%, transparent)",
                            }}
                            variant="outline"
                          >
                            Active Trade
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        {item.brand && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.brand}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {notes.gradingService && notes.gradingService !== "Raw"
                            ? `${notes.gradingService} ${notes.grade ?? ""}`.trim()
                            : conditionLabel(item.condition)}
                        </Badge>
                        <div className="font-serif text-sm">
                          {formatCurrency(item.currentValue)}
                        </div>
                      </div>
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setListItem(item);
                          }}
                        >
                          <ArrowLeftRight className="size-3.5 mr-1.5" />
                          List for trade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4 mr-1" /> Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
      {listItem && (
        <ListForTradeDialog
          open={!!listItem}
          onOpenChange={(v) => !v && setListItem(null)}
          item={listItem}
        />
      )}
    </div>
  );
}

function AddTcgDialog({
  game,
  type,
  onClose,
}: {
  game: TcgGameSlug;
  type: ItemType;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const createMut = useCreateVaultItem();

  const [single, setSingle] = useState({
    cardName: "",
    setName: "",
    cardNumber: "",
    condition: "near_mint" as string,
    gradingService: "Raw" as "Raw" | "PSA" | "BGS" | "CGC",
    grade: "",
    quantity: "1",
    value: "",
  });
  const [set, setSet] = useState({
    setName: "",
    releaseYear: "",
    sealed: "yes" as "yes" | "no",
    value: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const isSingle = type === "single";
    const name = isSingle ? single.cardName : set.setName;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const condition = isSingle
      ? (single.condition as "mint")
      : set.sealed === "yes"
        ? ("mint" as const)
        : ("near_mint" as const);
    const valueStr = isSingle ? single.value : set.value;
    const notes = isSingle
      ? encodeNotes({
          cardNumber: single.cardNumber || undefined,
          gradingService: single.gradingService,
          grade: single.grade || undefined,
          quantity: single.quantity ? Number(single.quantity) : undefined,
        })
      : encodeNotes({
          releaseYear: set.releaseYear ? Number(set.releaseYear) : undefined,
          sealed: set.sealed === "yes",
        });

    createMut.mutate(
      {
        data: {
          name,
          brand: (isSingle ? single.setName : set.setName) || undefined,
          category: tcgCategory(game, type),
          condition,
          currentValue: valueStr ? Number(valueStr) : undefined,
          notes,
        },
      },
      {
        onSuccess: () => {
          toast.success("Added to vault");
          qc.invalidateQueries();
          onClose();
        },
        onError: (e: unknown) => {
          const err = e as { status?: number; data?: { error?: string } };
          if (err.status === 402) {
            toast.error(err.data?.error ?? "Free tier limit reached", {
              description: "Upgrade to Premium for unlimited items.",
            });
          } else {
            toast.error("Could not add item");
          }
        },
      },
    );
  };

  const tier = me?.profile.tier ?? "free";
  const used = me?.profile.vaultCount ?? 0;
  const limit = me?.limits.vaultMax;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif">
          Add {tcgGameName(game)} {type === "single" ? "card" : "sealed set"}
        </DialogTitle>
        {tier === "free" && limit && (
          <p className="text-xs text-muted-foreground">
            {used}/{limit} items used on free tier
          </p>
        )}
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {type === "single" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Card name" required>
              <Input
                value={single.cardName}
                onChange={(e) => setSingle({ ...single, cardName: e.target.value })}
                required
              />
            </Field>
            <Field label="Set name">
              <Input
                value={single.setName}
                onChange={(e) => setSingle({ ...single, setName: e.target.value })}
              />
            </Field>
            <Field label="Card number">
              <Input
                value={single.cardNumber}
                onChange={(e) => setSingle({ ...single, cardNumber: e.target.value })}
              />
            </Field>
            <Field label="Grading">
              <Select
                value={single.gradingService}
                onValueChange={(v) =>
                  setSingle({
                    ...single,
                    gradingService: v as typeof single.gradingService,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Raw">Raw</SelectItem>
                  <SelectItem value="PSA">PSA</SelectItem>
                  <SelectItem value="BGS">BGS</SelectItem>
                  <SelectItem value="CGC">CGC</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {single.gradingService !== "Raw" && (
              <Field label="Grade">
                <Input
                  value={single.grade}
                  onChange={(e) => setSingle({ ...single, grade: e.target.value })}
                  placeholder="10"
                />
              </Field>
            )}
            <Field label="Condition">
              <Select
                value={single.condition}
                onValueChange={(v) => setSingle({ ...single, condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                value={single.quantity}
                onChange={(e) => setSingle({ ...single, quantity: e.target.value })}
              />
            </Field>
            <Field label="Estimated value">
              <Input
                type="number"
                step="0.01"
                value={single.value}
                onChange={(e) => setSingle({ ...single, value: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Set name" required>
              <Input
                value={set.setName}
                onChange={(e) => setSet({ ...set, setName: e.target.value })}
                required
              />
            </Field>
            <Field label="Release year">
              <Input
                type="number"
                value={set.releaseYear}
                onChange={(e) => setSet({ ...set, releaseYear: e.target.value })}
                placeholder="2024"
              />
            </Field>
            <Field label="Sealed">
              <Select
                value={set.sealed}
                onValueChange={(v) => setSet({ ...set, sealed: v as "yes" | "no" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — sealed</SelectItem>
                  <SelectItem value="no">No — opened</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated value">
              <Input
                type="number"
                step="0.01"
                value={set.value}
                onChange={(e) => setSet({ ...set, value: e.target.value })}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? "Adding…" : "Add to vault"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
