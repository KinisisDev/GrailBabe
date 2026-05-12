import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTrades,
  useCreateTrade,
  useDeleteTrade,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatRelativeDate, CONDITIONS } from "@/lib/format";

export default function TradesPage() {
  const { data, isLoading } = useListTrades();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const del = useDeleteTrade();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Trading Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buy, sell, and trade with collectors who care.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" /> New post
            </Button>
          </DialogTrigger>
          <NewTradeDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <Card><CardContent className="h-40" /></Card>
      ) : data && data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="font-serif text-2xl">No active listings</div>
            <p className="text-sm text-muted-foreground">
              Be the first to post a trade.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5 flex items-start gap-4">
                <Avatar className="size-10">
                  <AvatarImage src={t.userAvatar ?? undefined} />
                  <AvatarFallback>
                    {t.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className="uppercase text-[10px]"
                      variant={t.kind === "sell" ? "default" : "secondary"}
                    >
                      {t.kind}
                    </Badge>
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.userName} · {t.category} · {t.condition} ·{" "}
                    {formatRelativeDate(t.createdAt)}
                  </div>
                  {t.description && (
                    <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {t.askingPrice != null && (
                    <div className="font-serif text-xl">
                      {formatCurrency(t.askingPrice)}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!confirm("Delete your trade post?")) return;
                      del.mutate(
                        { id: t.id },
                        {
                          onSuccess: () => {
                            toast.success("Deleted");
                            qc.invalidateQueries();
                          },
                          onError: () =>
                            toast.error("You can only delete your own posts"),
                        },
                      );
                    }}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTradeDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const create = useCreateTrade();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "near_mint",
    askingPrice: "",
    kind: "sell" as "trade" | "sell" | "buy",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        data: {
          title: form.title,
          description: form.description || undefined,
          category: form.category,
          condition: form.condition,
          askingPrice: form.askingPrice ? Number(form.askingPrice) : undefined,
          kind: form.kind,
        },
      },
      {
        onSuccess: () => {
          toast.success("Posted");
          qc.invalidateQueries();
          onClose();
        },
        onError: () => toast.error("Could not post"),
      },
    );
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif">New trade post</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select
              value={form.kind}
              onValueChange={(v) =>
                setForm({ ...form, kind: v as typeof form.kind })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sell">Selling</SelectItem>
                <SelectItem value="trade">Trading</SelectItem>
                <SelectItem value="buy">Looking for</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Asking price">
            <Input
              type="number"
              step="0.01"
              value={form.askingPrice}
              onChange={(e) =>
                setForm({ ...form, askingPrice: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Title">
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
        </div>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
