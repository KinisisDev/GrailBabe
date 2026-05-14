import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Check, X, Ban, Mail } from "lucide-react";

const STANDARDS = [
  "Be respectful and constructive in all interactions",
  "Represent your items honestly and accurately",
  "Honor trade agreements you enter into",
  "Report suspicious activity or guideline violations",
  "Keep conversations relevant to collecting and the community",
];

const NOT_ALLOWED = [
  "Spam, self-promotion, or repetitive posts",
  "Harassment, hate speech, or personal attacks",
  "Off-topic content unrelated to collecting",
  "Sharing personal data or doxxing users",
  "Unsolicited direct messages or trade requests",
];

const PROHIBITED = [
  "Fake or exaggerated PSA/BGS grading claims",
  "Edited, filtered, or misleading card photos",
  "Listing items you do not own or possess",
  "Price manipulation and fake comparable listings",
  "Requesting off-platform payments (Venmo, Zelle, etc.)",
  "Creating multiple accounts after a ban",
];

const TIERS = [
  { tier: "Tier 1", body: "Warning + mandatory acknowledgment" },
  { tier: "Tier 2", body: "7-day suspension + listing removal" },
  { tier: "Tier 3", body: "30-day suspension + review required" },
  { tier: "Tier 4", body: "Permanent ban + account removal" },
];

export default function SecurityRulesPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/security">
          <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground">
            <ArrowLeft className="size-4 mr-1" />
            Security Center
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-lg grid place-items-center"
            style={{
              backgroundColor: "color-mix(in srgb, var(--neon-blue) 14%, transparent)",
              color: "var(--neon-blue)",
            }}
          >
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Community Guidelines</h1>
            <p className="text-sm text-muted-foreground mt-1">Effective May 2026</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-serif text-xl">Welcome to GrailBabe</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            GrailBabe is a community built for collectors of TCG, sports cards, and Lego. We're here to help
            you track, trade, and talk about the things you love. To keep this a safe and trusted space for
            everyone, all members are expected to follow these guidelines.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using GrailBabe, you agree to these community standards. Violations may result in content
            removal, account suspension, or a permanent ban depending on severity.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-serif text-xl">Community Standards</h2>
          <p className="text-sm text-muted-foreground">We expect all members to:</p>
          <ul className="space-y-2">
            {STANDARDS.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <Check className="size-4 mt-0.5 shrink-0" style={{ color: "var(--neon-green)" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-serif text-xl">Not Allowed</h2>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            May result in a warning or temporary restriction
          </p>
          <ul className="space-y-2">
            {NOT_ALLOWED.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <X className="size-4 mt-0.5 shrink-0" style={{ color: "var(--neon-yellow)" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-serif text-xl">Strictly Prohibited</h2>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Results in suspension or permanent ban
          </p>
          <ul className="space-y-2">
            {PROHIBITED.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <Ban className="size-4 mt-0.5 shrink-0" style={{ color: "var(--neon-red)" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-serif text-xl">Enforcement Tiers</h2>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Applied based on violation severity and history
          </p>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <div
                key={t.tier}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div
                  className="font-serif text-sm px-2.5 py-1 rounded"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--neon-blue) 14%, transparent)",
                    color: "var(--neon-blue)",
                  }}
                >
                  {t.tier}
                </div>
                <div className="text-sm text-foreground">{t.body}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 flex items-start gap-3">
          <Mail className="size-5 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-semibold">Appeals:</span>{" "}
            <a
              href="mailto:support@grailbabe.com"
              className="underline underline-offset-2 hover:text-foreground"
              style={{ color: "var(--neon-blue)" }}
            >
              support@grailbabe.com
            </a>{" "}
            within 14 days of action.
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
        This platform is not affiliated with, endorsed by, or sponsored by The Pokémon Company, Nintendo,
        Game Freak, or Creatures Inc. Pokémon and related properties are trademarks of their respective
        owners.
      </p>
    </div>
  );
}
