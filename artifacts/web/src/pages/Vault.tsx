import { useState } from "react";
import { Link } from "wouter";
import {
  useListVaultItems,
  useCreateVaultItem,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  CONDITIONS,
  conditionLabel,
  formatCurrency,
} from "@/lib/format";

export default function VaultPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "value" | "name">("recent");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useListVaultItems({
    search: search || undefined,
    sort,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every piece, in one place.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" /> Add item
            </Button>
          </DialogTrigger>
          <AddItemDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or brand"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="value">Highest value</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="font-serif text-2xl">Your vault is empty</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add your first collectible to start tracking value, condition, and
              history.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4 mr-1" /> Add your first item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((item) => (
            <Link key={item.id} href={`/vault/${item.id}`}>
                <Card className="h-full hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        {item.brand && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.brand}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">
                        {conditionLabel(item.condition)}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Current value
                        </div>
                        <div className="font-serif text-2xl">
                          {formatCurrency(item.currentValue)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {item.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const createMut = useCreateVaultItem();
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "",
    condition: "near_mint",
    purchasePrice: "",
    currentValue: "",
    notes: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(
      {
        data: {
          name: form.name,
          brand: form.brand || undefined,
          category: form.category,
          condition: form.condition as "mint",
          purchasePrice: form.purchasePrice
            ? Number(form.purchasePrice)
            : undefined,
          currentValue: form.currentValue
            ? Number(form.currentValue)
            : undefined,
          notes: form.notes || undefined,
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
        <DialogTitle className="font-serif">Add to vault</DialogTitle>
        {tier === "free" && limit && (
          <p className="text-xs text-muted-foreground">
            {used}/{limit} items used on free tier
          </p>
        )}
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Brand">
            <Input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </Field>
          <Field label="Category" required>
            <Input
              placeholder="Sneakers, cards, watches…"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </Field>
          <Field label="Condition">
            <Select
              value={form.condition}
              onValueChange={(v) => setForm({ ...form, condition: v })}
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
          <Field label="Purchase price">
            <Input
              type="number"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: e.target.value })
              }
            />
          </Field>
          <Field label="Current value">
            <Input
              type="number"
              step="0.01"
              value={form.currentValue}
              onChange={(e) =>
                setForm({ ...form, currentValue: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
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
