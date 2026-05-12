import { Link } from "wouter";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatRelativeDate,
  conditionLabel,
} from "@/lib/format";

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const p = data.portfolio;
  const positive = p.gain >= 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Welcome back.</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening across your collection.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Portfolio value"
          value={formatCurrency(p.totalValue)}
          accent
        />
        <StatCard
          label="Cost basis"
          value={formatCompactCurrency(p.totalCost)}
        />
        <StatCard
          label="Total gain"
          value={formatCurrency(p.gain)}
          delta={formatPercent(p.gainPct)}
          positive={positive}
        />
        <StatCard label="Items" value={String(p.itemCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif">Recent additions</CardTitle>
            <Link href="/vault">
              <Button variant="ghost" size="sm">
                View vault
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentItems.length === 0 ? (
              <EmptyHint
                title="No items yet"
                action={<Link href="/vault"><Button size="sm">Add your first piece</Button></Link>}
              />
            ) : (
              data.recentItems.map((i) => (
                <Link key={i.id} href={`/vault/${i.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.brand ? `${i.brand} · ` : ""}
                        {i.category} · {conditionLabel(i.condition)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(i.currentValue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeDate(i.createdAt)}
                      </div>
                    </div>
                  </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your activity will appear here.
              </p>
            ) : (
              data.activity.slice(0, 8).map((a) => (
                <div key={a.id} className="text-sm">
                  <div>{a.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeDate(a.createdAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif">Top grails</CardTitle>
            <Link href="/grail">
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topGrails.length === 0 ? (
              <EmptyHint title="No grails yet" />
            ) : (
              data.topGrails.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {g.category}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {g.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-serif">Hot trades</CardTitle>
            <Link href="/trades">
              <Button variant="ghost" size="sm">
                Browse
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.hotTrades.length === 0 ? (
              <EmptyHint title="No active trades" />
            ) : (
              data.hotTrades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.userName} · {t.category}
                    </div>
                  </div>
                  <Badge className="uppercase text-[10px]" variant="secondary">
                    {t.kind}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
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
        accent
          ? "bg-primary/10 border-primary/30"
          : "bg-card border-border"
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{value}</div>
      {delta && (
        <div
          className={`mt-1 text-xs ${
            positive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function EmptyHint({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-8 text-center text-sm text-muted-foreground space-y-3">
      <div>{title}</div>
      {action}
    </div>
  );
}
