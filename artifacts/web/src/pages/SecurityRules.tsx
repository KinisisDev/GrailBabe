import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

const SECTIONS = [
  {
    title: "Respect & Conduct",
    body: "No harassment, hate speech, or targeted abuse. Treat every collector with respect.",
  },
  {
    title: "Honest Listings",
    body: "All items must be accurately described. Misrepresenting condition, authenticity, or completeness is a bannable offense.",
  },
  {
    title: "No Counterfeits",
    body: "Listing, selling, or trading fake, proxy, or altered cards/sets is strictly prohibited and may result in legal action.",
  },
  {
    title: "Fair Trading",
    body: "No price manipulation, shill bidding, or predatory offers targeting new collectors.",
  },
  {
    title: "Payment Safety",
    body: "Only use GrailBabe's official payment system. Off-platform deals are not protected.",
  },
  {
    title: "Reporting",
    body: "If you see something, say something. False reports made in bad faith are also a violation.",
  },
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
            <h1 className="font-serif text-3xl tracking-tight">Community Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The standards every GrailBabe member agrees to.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardContent className="p-6">
              <h2 className="font-serif text-xl mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
