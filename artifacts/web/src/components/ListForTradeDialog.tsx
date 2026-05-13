import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTrade,
  getListMyTradesQueryKey,
  getListTradesQueryKey,
  type CollectionItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

export function ListForTradeDialog({
  open,
  onOpenChange,
  item,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: CollectionItem;
  onPosted?: () => void;
}) {
  const qc = useQueryClient();
  const create = useCreateTrade();
  const [wantedItems, setWantedItems] = useState("");
  const [askingPrice, setAskingPrice] = useState(
    item.currentValue != null ? String(item.currentValue) : "",
  );
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = wantedItems
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    create.mutate(
      {
        data: {
          title: item.name,
          description: description.trim() || undefined,
          category: item.category,
          condition: item.condition,
          kind: "trade",
          wantedItems: wanted,
          askingPrice: askingPrice ? Number(askingPrice) : undefined,
          vaultItemId: item.id,
        },
      },
      {
        onSuccess: () => {
          toast.success("Listed on the trading board");
          qc.invalidateQueries({
            queryKey: getListMyTradesQueryKey({ status: "all" }),
          });
          qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
          onOpenChange(false);
          setWantedItems("");
          setDescription("");
          onPosted?.();
        },
        onError: () => {
          toast.error("Could not list for trade");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">List for trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-md bg-muted/50 border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Item
            </div>
            <div className="text-sm font-semibold mt-1">{item.name}</div>
            {item.brand && (
              <div className="text-xs text-muted-foreground">{item.brand}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              What do you want? (one per line, leave blank for open offers)
            </Label>
            <Textarea
              rows={3}
              placeholder="e.g. Charizard PSA 9&#10;Cash + cards"
              value={wantedItems}
              onChange={(e) => setWantedItems(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Asking value (optional)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              rows={2}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Posting…" : "Post to trading board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
