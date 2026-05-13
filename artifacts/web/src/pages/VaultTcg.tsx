import { Link } from "wouter";
import { useListVaultItems } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { TCG_GAMES, isTcgGameCategory, type TcgGameSlug } from "@/lib/vaultCategory";
import pokemonBg from "@/assets/tcg-bg/pokemon.png";
import yugiohBg from "@/assets/tcg-bg/yugioh.png";
import mtgBg from "@/assets/tcg-bg/mtg.png";
import lorcanaBg from "@/assets/tcg-bg/lorcana.png";
import swuBg from "@/assets/tcg-bg/swu.png";
import riftboundBg from "@/assets/tcg-bg/riftbound.png";
import digimonBg from "@/assets/tcg-bg/digimon.png";
import onepieceBg from "@/assets/tcg-bg/onepiece.png";

const NEONS = [
  "var(--neon-blue)",
  "var(--neon-green)",
  "var(--neon-red)",
  "var(--neon-yellow)",
];

const TCG_BACKGROUNDS: Record<TcgGameSlug, string> = {
  pokemon: pokemonBg,
  yugioh: yugiohBg,
  mtg: mtgBg,
  lorcana: lorcanaBg,
  swu: swuBg,
  riftbound: riftboundBg,
  digimon: digimonBg,
  onepiece: onepieceBg,
};

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
          const bg = TCG_BACKGROUNDS[g.slug];
          return (
            <Link key={g.slug} href={`/vault/tcg/${g.slug}`}>
              <Card
                className="h-full hover:border-primary/40 cursor-pointer transition-colors relative overflow-hidden group"
                style={{ ["--neon" as never]: neon }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundImage: `url(${bg})`, filter: "brightness(1.35) saturate(1.1)" }}
                  aria-hidden
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/70 to-transparent"
                  aria-hidden
                />
                <CardContent className="p-5 space-y-3 relative aspect-[4/3] flex flex-col justify-end">
                  <div
                    className="size-10 rounded-lg grid place-items-center backdrop-blur-sm"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--neon) 22%, transparent)",
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
