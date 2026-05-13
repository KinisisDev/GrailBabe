import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAiInsights,
  useAiSearch,
  useGetMe,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Sparkles, Search, Lock } from "lucide-react";
import { formatCurrency, conditionLabel } from "@/lib/format";

export default function InsightsPage() {
  const { data: me } = useGetMe();
  const isPremium = me?.profile.tier === "premium";
  const [focus, setFocus] = useState<
    "overview" | "opportunities" | "risks" | "valuation"
  >("overview");
  const [q, setQ] = useState("");
  const insights = useGetAiInsights();
  const search = useAiSearch();

  if (!isPremium) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-5">
            <div className="size-12 rounded-full bg-primary/15 grid place-items-center mx-auto">
              <Lock className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">AI Insights are Premium</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Unlock Claude-powered analysis of your collection — opportunities,
                risks, and natural language search across your vault.
              </p>
            </div>
            <Link href="/billing">
              <Button>Upgrade to Premium</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight flex items-center gap-3">
          <Sparkles className="size-6 text-primary" />
          AI Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Powered by Claude. Updated on demand.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <Tabs value={focus} onValueChange={(v) => setFocus(v as typeof focus)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => insights.mutate({ data: { focus } })}
            disabled={insights.isPending}
          >
            {insights.isPending ? "Analyzing…" : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {insights.data ? (
            <div className="space-y-5">
              <p className="text-base">{insights.data.summary}</p>
              <div className="space-y-3">
                {insights.data.highlights.map((h, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      h.sentiment === "positive"
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : h.sentiment === "warning"
                          ? "border-blue-500/30 bg-blue-500/5"
                          : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="font-medium mb-1">{h.title}</div>
                    <p className="text-sm text-muted-foreground">{h.body}</p>
                    {h.itemId && (
                      <Link href={`/vault/${h.itemId}`} className="text-xs text-primary hover:underline mt-2 inline-block">
                          View item
                        </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Click Generate to analyze your collection with this focus.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Search className="size-4" /> Natural language search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!q.trim()) return;
              search.mutate({ data: { query: q } });
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="e.g. mint condition cards over $100"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" disabled={search.isPending || !q.trim()}>
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </form>
          {search.data && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">
                {search.data.interpretation}
              </p>
              {search.data.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches.</p>
              ) : (
                <div className="space-y-2">
                  {search.data.results.map((item) => (
                    <Link key={item.id} href={`/vault/${item.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.category} · {conditionLabel(item.condition)}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(item.currentValue)}
                        </Badge>
                      </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
