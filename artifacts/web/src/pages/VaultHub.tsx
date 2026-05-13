import { Link } from "wouter";
import { useListVaultItems } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Box, Trophy } from "lucide-react";
import { isTcgCategory, isLegoCategory } from "@/lib/vaultCategory";

export default function VaultHubPage() {
  const { data } = useListVaultItems();
  const items = data ?? [];
  const tcgCount = items.filter((i) => isTcgCategory(i.category)).length;
  const legoCount = items.filter((i) => isLegoCategory(i.category)).length;

  const tiles = [
    {
      to: "/vault/tcg",
      label: "TCG",
      desc: "Trading card games — sealed sets and singles",
      icon: Layers,
      count: tcgCount,
      enabled: true,
      neon: "var(--neon-blue)",
    },
    {
      to: "/vault/lego",
      label: "LEGO",
      desc: "Sealed sets, builds, and minifigs",
      icon: Box,
      count: legoCount,
      enabled: true,
      neon: "var(--neon-green)",
    },
    {
      to: "#",
      label: "Sports Cards",
      desc: "Coming soon",
      icon: Trophy,
      count: 0,
      enabled: false,
      neon: "var(--neon-yellow)",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">The Vault</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a category to view or add items.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const Inner = (
            <Card
              className={`h-full transition-colors ${t.enabled ? "hover:border-primary/40 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              style={{ ["--neon" as never]: t.neon }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className="size-12 rounded-lg grid place-items-center"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--neon) 14%, transparent)",
                      color: "var(--neon)",
                    }}
                  >
                    <Icon className="size-6" />
                  </div>
                  {!t.enabled && <Badge variant="outline">Coming soon</Badge>}
                </div>
                <div>
                  <div className="font-serif text-2xl">{t.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t.count} {t.count === 1 ? "item" : "items"}
                </div>
              </CardContent>
            </Card>
          );
          return t.enabled ? (
            <Link key={t.label} href={t.to}>
              {Inner}
            </Link>
          ) : (
            <div key={t.label}>{Inner}</div>
          );
        })}
      </div>
    </div>
  );
}
