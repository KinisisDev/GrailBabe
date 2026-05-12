import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetVaultItem,
  useDeleteVaultItem,
  useUpdateVaultItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatRelativeDate,
  conditionLabel,
} from "@/lib/format";
import { ArrowLeft, Trash2, Star } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export default function VaultItemPage({ id }: { id: number }) {
  const { data, isLoading } = useGetVaultItem(id);
  const qc = useQueryClient();
  const del = useDeleteVaultItem();
  const upd = useUpdateVaultItem();

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const item = data.item;
  const cost = item.purchasePrice ?? 0;
  const value = item.currentValue ?? 0;
  const gain = value - cost;
  const positive = gain >= 0;

  const chartData = data.priceHistory.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString(),
    price: p.price,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
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
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!confirm("Delete this item from your vault?")) return;
              del.mutate(
                { id },
                {
                  onSuccess: () => {
                    toast.success("Deleted");
                    qc.invalidateQueries();
                    history.back();
                  },
                },
              );
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Current value" value={formatCurrency(item.currentValue)} accent />
        <Stat label="Purchase price" value={formatCurrency(item.purchasePrice)} />
        <Stat
          label="Gain"
          value={formatCurrency(gain)}
          positive={positive}
        />
      </div>

      {chartData.length > 1 && (
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
          {data.priceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded prices yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.priceHistory.map((p) => (
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
              ? "text-rose-400"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
