import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListVaultItems,
  useCreateVaultItem,
  useGetMe,
} from "@workspace/api-client-react";
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
import { formatCurrency } from "@/lib/format";
import {
  ItemType,
  legoCategory,
  isLegoCategory,
  categoryItemType,
  decodeNotes,
  encodeNotes,
  PAGE_SIZE,
  SortKey,
  sortItems,
} from "@/lib/vaultCategory";

export default function VaultLegoPage() {
  const [type, setType] = useState<ItemType>("set");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useListVaultItems();

  const filtered = useMemo(() => {
    return (data ?? []).filter(
      (i) => isLegoCategory(i.category) && categoryItemType(i.category) === type,
    );
  }, [data, type]);

  const sorted = useMemo(() => sortItems(filtered, sort), [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/vault">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2">
              <ArrowLeft className="size-4 mr-1" /> The Vault
            </Button>
          </Link>
          <h1 className="font-serif text-3xl tracking-tight">LEGO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sorted.length} {sorted.length === 1 ? type : `${type}s`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" /> Add {type === "set" ? "set" : "item"}
            </Button>
          </DialogTrigger>
          <AddLegoDialog type={type} onClose={() => setOpen(false)} />
        </Dialog>
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
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="setNumber">Set number</SelectItem>
            <SelectItem value="theme">Theme</SelectItem>
            <SelectItem value="recent">Date added</SelectItem>
            <SelectItem value="value">Value (high to low)</SelectItem>
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
            <div className="font-serif text-2xl">No LEGO {type}s yet</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add your first LEGO {type === "set" ? "set" : "item"} to start tracking.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4 mr-1" /> Add {type === "set" ? "set" : "item"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pageItems.map((item) => {
              const notes = decodeNotes(item.notes);
              return (
                <Link key={item.id} href={`/vault/${item.id}`}>
                  <Card className="h-full hover:border-primary/40 cursor-pointer transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="aspect-[4/3] rounded-md bg-muted/40 grid place-items-center text-xs text-muted-foreground">
                        No image
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[notes.setNumber, notes.theme].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {notes.status ?? "—"}
                        </Badge>
                        <div className="font-serif text-sm">
                          {formatCurrency(item.currentValue)}
                        </div>
                      </div>
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
    </div>
  );
}

function AddLegoDialog({
  type,
  onClose,
}: {
  type: ItemType;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const createMut = useCreateVaultItem();
  const [form, setForm] = useState({
    name: "",
    setNumber: "",
    theme: "",
    year: "",
    status: "Sealed" as "Sealed" | "Built" | "Incomplete",
    minifigCount: "",
    pieceCount: "",
    value: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const condition =
      form.status === "Sealed"
        ? ("mint" as const)
        : form.status === "Built"
          ? ("near_mint" as const)
          : ("good" as const);
    createMut.mutate(
      {
        data: {
          name: form.name,
          brand: form.setNumber || undefined,
          category: legoCategory(type),
          condition,
          currentValue: form.value ? Number(form.value) : undefined,
          notes: encodeNotes({
            setNumber: form.setNumber || undefined,
            theme: form.theme || undefined,
            year: form.year ? Number(form.year) : undefined,
            status: form.status,
            minifigCount: form.minifigCount ? Number(form.minifigCount) : undefined,
            pieceCount: form.pieceCount ? Number(form.pieceCount) : undefined,
          }),
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
          Add LEGO {type === "set" ? "set" : "item"}
        </DialogTitle>
        {tier === "free" && limit && (
          <p className="text-xs text-muted-foreground">
            {used}/{limit} items used on free tier
          </p>
        )}
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Set name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Set number">
            <Input
              value={form.setNumber}
              onChange={(e) => setForm({ ...form, setNumber: e.target.value })}
              placeholder="10497"
            />
          </Field>
          <Field label="Theme">
            <Input
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder="Star Wars, Icons, Technic…"
            />
          </Field>
          <Field label="Year">
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2024"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as typeof form.status })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sealed">Sealed</SelectItem>
                <SelectItem value="Built">Built</SelectItem>
                <SelectItem value="Incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Minifig count">
            <Input
              type="number"
              value={form.minifigCount}
              onChange={(e) => setForm({ ...form, minifigCount: e.target.value })}
            />
          </Field>
          <Field label="Piece count">
            <Input
              type="number"
              value={form.pieceCount}
              onChange={(e) => setForm({ ...form, pieceCount: e.target.value })}
            />
          </Field>
          <Field label="Estimated value">
            <Input
              type="number"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </Field>
        </div>
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
