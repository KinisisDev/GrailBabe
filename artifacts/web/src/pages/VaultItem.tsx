import * as React from "react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetVaultItem,
  useDeleteVaultItem,
  useUpdateVaultItem,
  type CollectionItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatRelativeDate,
  conditionLabel,
  CONDITIONS,
} from "@/lib/format";
import { ArrowLeft, Trash2, Star, Pencil } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { VaultItemImages } from "@/components/VaultItemImages";

export default function VaultItemPage({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useGetVaultItem(id);
  const qc = useQueryClient();
  const del = useDeleteVaultItem();
  const upd = useUpdateVaultItem();
  const [, navigate] = useLocation();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/vault" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to vault
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <h2 className="font-serif text-xl">Could not load item</h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "The item could not be loaded. It may have been deleted or you may not have access."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const item = data.item;
  const priceHistory = data.priceHistory;

  const cost = item.purchasePrice ?? 0;
  const value = item.currentValue ?? 0;
  const gain = value - cost;
  const positive = gain >= 0;

  const chartData = priceHistory.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString(),
    price: p.price,
  }));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/vault" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to vault
        </Link>

      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">{item.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            {item.brand && <span>{item.brand}</span>}
            <span>·</span>
            <Badge variant="secondary" className="capitalize">
              {item.category}
            </Badge>
            <Badge variant="outline">{conditionLabel(item.condition)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              upd.mutate(
                { id, data: { favorite: !item.favorite } },
                { onSuccess: () => qc.invalidateQueries() },
              )
            }
          >
            <Star
              className={`size-4 ${item.favorite ? "fill-accent text-accent" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!confirm("Delete this item from your vault? This cannot be undone.")) return;
              del.mutate(
                { id },
                {
                  onSuccess: () => {
                    toast.success("Deleted");
                    qc.invalidateQueries();
                    navigate("/vault");
                  },
                  onError: (e) => {
                    toast.error(e instanceof Error ? e.message : "Could not delete");
                  },
                },
              );
            }}
            disabled={del.isPending}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <EditItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        id={id}
        item={item}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Current value" value={formatCurrency(item.currentValue)} accent />
        <Stat label="Purchase price" value={formatCurrency(item.purchasePrice)} />
        <Stat
          label="Gain"
          value={formatCurrency(gain)}
          positive={positive}
        />
      </div>

      {priceHistory.length > 1 && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Price history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <VaultItemImages itemId={item.id} category={item.category} />

      {item.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {item.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Price log</CardTitle>
        </CardHeader>
        <CardContent>
          {priceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded prices yet.
            </p>
          ) : (
            <div className="space-y-2">
              {priceHistory.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground">
                    {formatRelativeDate(p.recordedAt)} · {p.source}
                  </span>
                  <span className="font-medium">{formatCurrency(p.price)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
  accent,
}: {
  label: string;
  value: string;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent ? "bg-primary/10 border-primary/30" : "bg-card border-border"
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 font-serif text-2xl ${
          positive === true
            ? "text-emerald-400"
            : positive === false
              ? "text-blue-400"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EditItemDialog({
  open,
  onOpenChange,
  id,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  id: number;
  item: CollectionItem;
}) {
  const qc = useQueryClient();
  const upd = useUpdateVaultItem();
  const [form, setForm] = useState({
    name: item.name,
    brand: item.brand ?? "",
    category: item.category,
    condition: item.condition,
    purchasePrice:
      item.purchasePrice !== undefined && item.purchasePrice !== null
        ? String(item.purchasePrice)
        : "",
    currentValue:
      item.currentValue !== undefined && item.currentValue !== null
        ? String(item.currentValue)
        : "",
    notes: item.notes ?? "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: item.name,
        brand: item.brand ?? "",
        category: item.category,
        condition: item.condition,
        purchasePrice:
          item.purchasePrice !== undefined && item.purchasePrice !== null
            ? String(item.purchasePrice)
            : "",
        currentValue:
          item.currentValue !== undefined && item.currentValue !== null
            ? String(item.currentValue)
            : "",
        notes: item.notes ?? "",
      });
    }
  }, [open, item]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    upd.mutate(
      {
        id,
        data: {
          name: trimmed,
          brand: form.brand.trim() || undefined,
          category: form.category.trim() || item.category,
          condition: form.condition,
          purchasePrice: form.purchasePrice
            ? Number(form.purchasePrice)
            : undefined,
          currentValue: form.currentValue
            ? Number(form.currentValue)
            : undefined,
          notes: form.notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Saved");
          qc.invalidateQueries();
          onOpenChange(false);
        },
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : "Could not save");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <EditField label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </EditField>
            <EditField label="Brand">
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </EditField>
            <EditField label="Category">
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              />
            </EditField>
            <EditField label="Condition">
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    condition: v as CollectionItem["condition"],
                  })
                }
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
            </EditField>
            <EditField label="Purchase price">
              <Input
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) =>
                  setForm({ ...form, purchasePrice: e.target.value })
                }
              />
            </EditField>
            <EditField label="Current value">
              <Input
                type="number"
                step="0.01"
                value={form.currentValue}
                onChange={(e) =>
                  setForm({ ...form, currentValue: e.target.value })
                }
              />
            </EditField>
          </div>
          <EditField label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </EditField>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={upd.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={upd.isPending}>
              {upd.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
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
