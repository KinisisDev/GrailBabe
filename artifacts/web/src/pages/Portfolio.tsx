import { useState } from "react";
import {
  useGetPortfolioSummary,
  useGetPortfolioByCategory,
  useGetPortfolioTimeline,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatPercent,
  formatCompactCurrency,
} from "@/lib/format";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(322, 88%, 62%)",
  "hsl(38, 92%, 60%)",
  "hsl(158, 64%, 52%)",
  "hsl(214, 95%, 65%)",
  "hsl(280, 80%, 65%)",
  "hsl(20, 88%, 60%)",
];

const RANGES = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "ALL" },
] as const;

export default function PortfolioPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">(
    "30d",
  );
  const summaryQ = useGetPortfolioSummary();
  const byCatQ = useGetPortfolioByCategory();
  const timelineQ = useGetPortfolioTimeline({ range });

  const summary = summaryQ.data;
  const positive = summary ? summary.gain >= 0 : true;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The shape of your collection.
        </p>
      </div>

      {summaryQ.isLoading || !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Value" value={formatCurrency(summary.totalValue)} accent />
          <Stat label="Cost" value={formatCompactCurrency(summary.totalCost)} />
          <Stat
            label="Gain"
            value={formatCurrency(summary.gain)}
            delta={formatPercent(summary.gainPct)}
            positive={positive}
          />
          <Stat
            label="Top category"
            value={summary.topCategory ?? "—"}
          />
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-serif">Value over time</CardTitle>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? "default" : "ghost"}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {timelineQ.isLoading ? (
            <Skeleton className="h-64" />
          ) : timelineQ.data && timelineQ.data.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineQ.data.map((p) => ({
                  date: new Date(p.date).toLocaleDateString(),
                  value: p.value,
                }))}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(322, 88%, 62%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(322, 88%, 62%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#grad1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Add value updates to your items to see your portfolio timeline.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">By category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCatQ.data && byCatQ.data.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCatQ.data}
                      dataKey="value"
                      nameKey="category"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {byCatQ.data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Add items to see your category breakdown.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Best & worst</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.bestPerformer ? (
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-400 mb-1">
                  Best performer
                </div>
                <div className="font-medium">{summary.bestPerformer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(summary.bestPerformer.purchasePrice)} →{" "}
                  {formatCurrency(summary.bestPerformer.currentValue)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Track purchase + current values to see top performers.
              </p>
            )}
            {summary?.worstPerformer && summary.worstPerformer.id !== summary.bestPerformer?.id && (
              <div>
                <div className="text-xs uppercase tracking-widest text-blue-400 mb-1">
                  Worst performer
                </div>
                <div className="font-medium">{summary.worstPerformer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(summary.worstPerformer.purchasePrice)} →{" "}
                  {formatCurrency(summary.worstPerformer.currentValue)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {byCatQ.data && byCatQ.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Category detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCatQ.data.map((c, i) => (
              <div
                key={c.category}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="font-medium capitalize">{c.category}</span>
                  <Badge variant="outline">{c.itemCount} items</Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(c.value)}</div>
                  <div className="text-xs text-muted-foreground">
                    cost {formatCurrency(c.costBasis)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  positive,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
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
      <div className="mt-2 font-serif text-2xl tracking-tight">{value}</div>
      {delta && (
        <div
          className={`mt-1 text-xs ${
            positive ? "text-emerald-400" : "text-blue-400"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
