import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMyTrades,
  getListMyTradesQueryKey,
  useConfirmTradeComplete,
  useCancelTrade,
  useLeaveTradeReview,
  type MyTrade,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

type TabKey = "all" | "active" | "pending" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function StatusBadge({ status }: { status: MyTrade["status"] }) {
  const map: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: "var(--neon-blue)" },
    pending: { label: "Pending", color: "var(--neon-yellow)" },
    completed: { label: "Completed", color: "var(--neon-green)" },
    cancelled: { label: "Cancelled", color: "var(--muted-foreground)" },
    closed: { label: "Closed", color: "var(--muted-foreground)" },
  };
  const { label, color } = map[status] ?? map.open;
  return (
    <Badge
      variant="outline"
      className="text-[10px] uppercase tracking-wide"
      style={{
        borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {label}
    </Badge>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function StarsDisplay({ value }: { value: number }) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="size-3.5"
          style={{
            color: n <= value ? "#ef9f27" : "var(--muted-foreground)",
            fill: n <= value ? "#ef9f27" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

export default function MyTradesPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">My Trades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your active and completed trades.
        </p>
      </div>
      <MyTradesView />
    </div>
  );
}

export function MyTradesView() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("all");

  const { data: allTrades = [], isLoading } = useListMyTrades(
    { status: "all" },
    {
      query: {
        queryKey: getListMyTradesQueryKey({ status: "all" }),
        refetchOnWindowFocus: true,
      },
    },
  );

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, pending: 0, completed: 0, cancelled: 0 };
    for (const t of allTrades) {
      c.all += 1;
      if (t.status === "open") c.active += 1;
      if (t.status === "pending") {
        c.active += 1;
        c.pending += 1;
      }
      if (t.status === "completed") c.completed += 1;
      if (t.status === "cancelled") c.cancelled += 1;
    }
    return c;
  }, [allTrades]);

  const visible = useMemo(() => {
    if (tab === "all") return allTrades;
    if (tab === "active")
      return allTrades.filter(
        (t) => t.status === "open" || t.status === "pending",
      );
    return allTrades.filter((t) => t.status === tab);
  }, [allTrades, tab]);

  const stats = useMemo(() => {
    const completedReviews = allTrades.filter((t) => t.myReview);
    const ratings = completedReviews
      .map((t) => t.myReview?.rating ?? 0)
      .filter((r) => r > 0);
    const ratingsAboutMe = allTrades
      .map((t) => t.theirReview?.rating ?? 0)
      .filter((r) => r > 0);
    const avg =
      ratingsAboutMe.length > 0
        ? ratingsAboutMe.reduce((a, b) => a + b, 0) / ratingsAboutMe.length
        : null;
    void ratings;
    return {
      active: counts.active,
      completed: counts.completed,
      rep: avg,
    };
  }, [allTrades, counts]);

  const refresh = () =>
    qc.invalidateQueries({ queryKey: getListMyTradesQueryKey({ status: "all" }) });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Active trades" value={String(stats.active)} />
        <StatCard label="Completed trades" value={String(stats.completed)} />
        <StatCard
          label="Rep score"
          value={stats.rep != null ? `${stats.rep.toFixed(1)} ★` : "—"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin inline-block mr-2" />
            Loading…
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {tab === "active" && (
              <>
                No active trades.{" "}
                <Link href="/trades" className="underline">
                  Post one on the Trading Board.
                </Link>
              </>
            )}
            {tab === "pending" && "No pending trades."}
            {tab === "completed" && "No completed trades yet."}
            {tab === "cancelled" && "No cancelled trades."}
            {tab === "all" && (
              <>
                No trades yet.{" "}
                <Link href="/trades" className="underline">
                  Post one on the Trading Board.
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <TradeRow key={t.id} trade={t} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 border border-border">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="font-serif text-2xl mt-1">{value}</div>
    </div>
  );
}

function TradeRow({
  trade,
  onChanged,
}: {
  trade: MyTrade;
  onChanged: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const confirmMut = useConfirmTradeComplete();
  const cancelMut = useCancelTrade();

  const wantText =
    trade.wantedItems && trade.wantedItems.length > 0
      ? trade.wantedItems.join(", ")
      : "Open to offers";

  const otherName = trade.otherParty?.screenname
    ? `@${trade.otherParty.screenname}`
    : "—";

  const handleConfirm = async () => {
    try {
      await confirmMut.mutateAsync({ id: trade.id });
      toast.success("Marked as complete");
      onChanged();
    } catch {
      toast.error("Could not confirm");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync({ id: trade.id });
      toast.success("Trade cancelled");
      onChanged();
      setCancelOpen(false);
    } catch {
      toast.error("Could not cancel");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={trade.status} />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {trade.role === "poster" ? "Your listing" : "Your offer"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {trade.status === "completed" && trade.completedAt
              ? `Completed ${timeAgo(trade.completedAt)}`
              : `Posted ${timeAgo(trade.postedAt)}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <div className="rounded-md bg-muted/50 border border-border p-3 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Have
            </div>
            <div className="text-sm font-semibold truncate mt-1">
              {trade.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {trade.condition}
            </div>
          </div>
          <div className="self-center justify-self-center text-muted-foreground rotate-90 sm:rotate-0">
            <ArrowRight className="size-4" />
          </div>
          <div className="rounded-md border border-dashed border-border p-3 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Want
            </div>
            <div className="text-sm mt-1 truncate">{wantText}</div>
          </div>
        </div>

        {trade.otherParty && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="size-8 rounded-full grid place-items-center text-xs font-semibold shrink-0"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--neon-blue) 22%, transparent)",
                  color: "var(--neon-blue)",
                }}
              >
                {trade.otherParty.initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {trade.role === "poster"
                    ? trade.status === "pending"
                      ? `Offer from ${otherName}`
                      : `Trade with ${otherName}`
                    : `Your offer to ${otherName}`}
                </div>
                <Link
                  href={`/messages?conversation=${trade.otherParty.id}`}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Message
                </Link>
              </div>
            </div>
          </div>
        )}

        <ActionsRow
          trade={trade}
          onConfirm={handleConfirm}
          onCancel={() => setCancelOpen(true)}
          onReview={() => setReviewOpen(true)}
          confirming={confirmMut.isPending}
        />

        {trade.status === "completed" && trade.myReview && (
          <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Your review
            </div>
            <StarsDisplay value={trade.myReview.rating} />
            {trade.myReview.comment && (
              <div className="text-xs text-muted-foreground italic">
                "{trade.myReview.comment}"
              </div>
            )}
          </div>
        )}

        {trade.status === "completed" &&
          (trade.theirReview ? (
            <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {otherName}'s review of you
              </div>
              <StarsDisplay value={trade.theirReview.rating} />
            </div>
          ) : trade.myReview ? (
            <div className="text-xs text-muted-foreground italic">
              Waiting for {otherName}'s review.
            </div>
          ) : null)}
      </CardContent>

      <ReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        tradeId={trade.id}
        otherName={otherName}
        onSubmitted={onChanged}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this trade?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the trade as cancelled. You can't undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep trade</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
            >
              Cancel trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ActionsRow({
  trade,
  onConfirm,
  onCancel,
  onReview,
  confirming,
}: {
  trade: MyTrade;
  onConfirm: () => void;
  onCancel: () => void;
  onReview: () => void;
  confirming: boolean;
}) {
  const otherName = trade.otherParty?.screenname
    ? `@${trade.otherParty.screenname}`
    : "the other party";

  if (trade.status === "open" && trade.role === "poster") {
    return (
      <div className="flex justify-end pt-2 border-t border-border">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel listing
        </Button>
      </div>
    );
  }

  if (trade.status === "pending") {
    if (!trade.myConfirmed) {
      return (
        <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground italic">
            Both parties must confirm to complete the trade.
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel trade
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : null}
              Mark as complete
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground italic">
          You confirmed completion — waiting for {otherName} to confirm.
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel trade
          </Button>
          <Button size="sm" disabled variant="outline">
            Waiting for confirmation…
          </Button>
        </div>
      </div>
    );
  }

  if (trade.status === "completed" && !trade.myReview) {
    return (
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs font-medium" style={{ color: "var(--neon-green)" }}>
          ✓ Trade complete
        </span>
        <Button size="sm" onClick={onReview}>
          Leave a review for {otherName}
        </Button>
      </div>
    );
  }

  if (trade.status === "cancelled") {
    return (
      <div className="text-xs text-muted-foreground pt-2 border-t border-border">
        Cancelled
      </div>
    );
  }

  return null;
}

function ReviewModal({
  open,
  onOpenChange,
  tradeId,
  otherName,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tradeId: number;
  otherName: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const mut = useLeaveTradeReview();

  const submit = async () => {
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }
    try {
      await mut.mutateAsync({
        id: tradeId,
        data: { rating, comment: comment.trim() || null },
      });
      toast.success("Review submitted");
      onOpenChange(false);
      setRating(0);
      setComment("");
      onSubmitted();
    } catch {
      toast.error("Could not submit review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Review your trade with {otherName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Rating
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                >
                  <Star
                    className="size-7 transition-colors"
                    style={{
                      color:
                        n <= (hover || rating)
                          ? "#ef9f27"
                          : "var(--muted-foreground)",
                      fill:
                        n <= (hover || rating) ? "#ef9f27" : "transparent",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Comment (optional)
            </div>
            <Textarea
              placeholder="How did the trade go? (optional)"
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="text-[10px] text-muted-foreground text-right mt-1">
              {comment.length}/300
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending || rating < 1}>
            {mut.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : null}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
