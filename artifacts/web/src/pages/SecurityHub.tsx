import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, BookOpen, Scale, AlertTriangle } from "lucide-react";

export default function SecurityHubPage() {
  const tiles = [
    {
      to: "/security/rules",
      label: "Community Rules",
      desc: "How we treat each other and protect the community",
      icon: BookOpen,
      neon: "var(--neon-blue)",
    },
    {
      to: "/security/legal",
      label: "Legal & Policies",
      desc: "Terms of service, privacy policy, and your rights",
      icon: Scale,
      neon: "var(--neon-green)",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div
          className="size-14 rounded-lg grid place-items-center shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--neon-blue) 14%, transparent)",
            color: "var(--neon-blue)",
          }}
        >
          <Shield className="size-7" />
        </div>
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Security Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            GrailBabe is built for collectors, by collectors. We keep it safe.
          </p>
        </div>
      </div>

      <div
        className="rounded-md border p-4 flex items-start gap-3"
        style={{
          borderColor: "color-mix(in srgb, var(--neon-blue) 40%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--neon-blue) 10%, transparent)",
        }}
      >
        <AlertTriangle className="size-5 shrink-0 mt-0.5" style={{ color: "var(--neon-blue)" }} />
        <div className="text-sm">
          <span className="font-semibold" style={{ color: "var(--neon-blue)" }}>
            Zero Tolerance
          </span>
          <span className="text-foreground/90"> — Fake cards, scams, and abuse result in permanent bans</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} href={t.to}>
              <Card
                className="h-full transition-colors hover:border-primary/40 cursor-pointer"
                style={{ ["--neon" as never]: t.neon }}
              >
                <CardContent className="p-6 space-y-4">
                  <div
                    className="size-12 rounded-lg grid place-items-center"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--neon) 14%, transparent)",
                      color: "var(--neon)",
                    }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <div className="font-serif text-2xl">{t.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
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
