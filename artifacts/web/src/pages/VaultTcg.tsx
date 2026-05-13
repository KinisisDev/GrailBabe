import { Link } from "wouter";
import { useListVaultItems } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { TCG_GAMES, isTcgGameCategory } from "@/lib/vaultCategory";

const NEONS = [
  "var(--neon-blue)",
  "var(--neon-green)",
  "var(--neon-red)",
  "var(--neon-yellow)",
];

export default function VaultTcgPage() {
  const { data } = useListVaultItems();
  const items = data ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/vault">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2">
              <ArrowLeft className="size-4 mr-1" /> The Vault
            </Button>
          </Link>
          <h1 className="font-serif text-3xl tracking-tight">TCG</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a game to manage your collection.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {TCG_GAMES.map((g, idx) => {
          const count = items.filter((i) => isTcgGameCategory(i.category, g.slug)).length;
          const neon = NEONS[idx % NEONS.length];
          return (
            <Link key={g.slug} href={`/vault/tcg/${g.slug}`}>
              <Card
                className="h-full hover:border-primary/40 cursor-pointer transition-colors"
                style={{ ["--neon" as never]: neon }}
              >
                <CardContent className="p-5 space-y-3">
                  <div
                    className="size-10 rounded-lg grid place-items-center"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--neon) 14%, transparent)",
                      color: "var(--neon)",
                    }}
                  >
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "item" : "items"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
