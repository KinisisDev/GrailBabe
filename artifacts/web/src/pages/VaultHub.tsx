import { Link } from "wouter";
import { useListVaultItems } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Box, Trophy } from "lucide-react";
import { isTcgCategory, isLegoCategory } from "@/lib/vaultCategory";
import tcgBg from "@/assets/vault-bg/tcg.png";
import legoBg from "@/assets/vault-bg/lego.png";
import sportsBg from "@/assets/vault-bg/sports.png";

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
      bg: tcgBg,
    },
    {
      to: "/vault/lego",
      label: "LEGO",
      desc: "Sealed sets, builds, and minifigs",
      icon: Box,
      count: legoCount,
      enabled: true,
      neon: "var(--neon-green)",
      bg: legoBg,
    },
    {
      to: "#",
      label: "Sports Cards",
      desc: "Coming soon",
      icon: Trophy,
      count: 0,
      enabled: false,
      neon: "var(--neon-yellow)",
      bg: sportsBg,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
              className={`h-full transition-colors relative overflow-hidden group ${t.enabled ? "hover:border-primary/40 cursor-pointer" : "cursor-not-allowed"}`}
              style={{ ["--neon" as never]: t.neon }}
            >
              <div
                className={`absolute inset-0 bg-cover bg-center transition-opacity ${t.enabled ? "opacity-90 group-hover:opacity-100" : "opacity-50"}`}
                style={{
                  backgroundImage: `url(${t.bg})`,
                  filter: "brightness(1.3) saturate(1.1)",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/70 to-transparent"
                aria-hidden
              />
              <CardContent className="p-6 space-y-4 relative aspect-[4/3] flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <div
                    className="size-12 rounded-lg grid place-items-center backdrop-blur-sm"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--neon) 22%, transparent)",
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
