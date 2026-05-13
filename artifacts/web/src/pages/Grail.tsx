import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGrails,
  useCreateGrail,
  useUpdateGrail,
  useDeleteGrail,
  useGetMe,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

export default function GrailPage() {
  const { data, isLoading } = useListGrails();
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Grail List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The pieces you're hunting.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" /> Add grail
            </Button>
          </DialogTrigger>
          <AddGrailDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardContent className="h-32" /></Card>
          <Card><CardContent className="h-32" /></Card>
        </div>
      ) : data && data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="font-serif text-2xl">No grails yet</div>
            <p className="text-sm text-muted-foreground">
              Track the pieces you want most.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4 mr-1" /> Add a grail
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data ?? []).map((g) => (
            <GrailCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrailCard({
  g,
}: {
  g: {
    id: number;
    name: string;
    category: string;
    targetPrice?: number | null;
    notes?: string | null;
    priority: "low" | "medium" | "high";
    acquired?: boolean;
  };
}) {
  const qc = useQueryClient();
  const upd = useUpdateGrail();
  const del = useDeleteGrail();

  return (
    <Card className={g.acquired ? "opacity-60" : ""}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium">{g.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {g.category}
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              g.priority === "high"
                ? "border-primary/40 text-primary"
                : g.priority === "medium"
                  ? "border-accent/40 text-accent"
                  : ""
            }
          >
            {g.priority}
          </Badge>
        </div>
        {g.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{g.notes}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm">
            <span className="text-muted-foreground text-xs uppercase tracking-wide mr-2">
              Target
            </span>
            <span className="font-medium">
              {formatCurrency(g.targetPrice ?? null)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title={g.acquired ? "Mark hunting" : "Mark acquired"}
              onClick={() =>
                upd.mutate(
                  { id: g.id, data: { acquired: !g.acquired } },
                  {
                    onSuccess: () => {
                      toast.success(g.acquired ? "Marked hunting" : "Acquired!");
                      qc.invalidateQueries();
                    },
                  },
                )
              }
            >
              <Check className="size-4 text-emerald-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!confirm("Remove this grail?")) return;
                del.mutate(
                  { id: g.id },
                  {
                    onSuccess: () => {
                      toast.success("Removed");
                      qc.invalidateQueries();
                    },
                  },
                );
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddGrailDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const createMut = useCreateGrail();
  const [form, setForm] = useState({
    name: "",
    category: "",
    targetPrice: "",
    priority: "medium",
    notes: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(
      {
        data: {
          name: form.name,
          category: form.category,
          targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
          priority: form.priority as "low" | "medium" | "high",
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Added grail");
          qc.invalidateQueries();
          onClose();
        },
        onError: (e: unknown) => {
          const err = e as { status?: number; data?: { error?: string } };
          if (err.status === 402) {
            toast.error(err.data?.error ?? "Free tier limit reached", {
              description: "Upgrade to Premium for unlimited grails.",
            });
          } else {
            toast.error("Could not add grail");
          }
        },
      },
    );
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif">Add a grail</DialogTitle>
        {me?.profile.tier === "free" && me.limits.grailMax && (
          <p className="text-xs text-muted-foreground">
            {me.profile.grailCount}/{me.limits.grailMax} on free tier
          </p>
        )}
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Input
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target price">
            <Input
              type="number"
              step="0.01"
              value={form.targetPrice}
              onChange={(e) =>
                setForm({ ...form, targetPrice: e.target.value })
              }
            />
          </Field>
          <Field label="Priority">
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? "Adding…" : "Add grail"}
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
