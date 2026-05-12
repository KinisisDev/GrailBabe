import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-primary/15 grid place-items-center ring-1 ring-primary/30">
            <span className="text-primary font-serif font-semibold text-lg">G</span>
          </div>
          <div>
            <div className="font-serif text-xl tracking-tight">GrailBabe</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Collector Operating System
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-32 text-center">
        <Badge
          variant="outline"
          className="border-primary/30 text-primary uppercase tracking-widest text-[10px] mb-8"
        >
          Built for serious collectors
        </Badge>
        <h1 className="font-serif text-6xl md:text-7xl leading-[1.05] tracking-tight">
          Your grails, valued.
          <br />
          <span className="text-primary">Tracked. Traded.</span>
        </h1>
        <p className="mt-8 text-lg text-muted-foreground max-w-2xl mx-auto">
          GrailBabe is a private vault for what you collect. Track every piece,
          watch your portfolio compound, and trade with people who actually
          care.
        </p>
        <div className="mt-12 flex items-center justify-center gap-3">
          <Link href="/sign-up">
            <Button size="lg" className="px-8">
              Start free
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="px-8">
              I already have an account
            </Button>
          </Link>
        </div>
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "Vault",
              body: "A beautiful home for every piece. Photos, condition, purchase price, current value.",
            },
            {
              title: "Portfolio",
              body: "Watch your collection compound. Category breakdowns, gain/loss, timeline.",
            },
            {
              title: "AI Insights",
              body: "Claude tells you what's working, what's not, and what to watch.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <div className="font-serif text-xl mb-2">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
