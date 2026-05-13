import { useEffect, useMemo, useState } from "react";
import {
  useListBillingPlans,
  useGetMe,
  useCreateCheckout,
  useCreateBillingPortal,
  type BillingPlan,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles, Crown, Star } from "lucide-react";
import { toast } from "sonner";

type Interval = "month" | "year";

interface Tier {
  key: "scout" | "seeker" | "master";
  name: string;
  tagline: string;
  monthly: number | null; // dollars; null = free
  yearly: number | null;
  features: string[];
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  cta: string;
}

const TIERS: Tier[] = [
  {
    key: "scout",
    name: "Grail Scout",
    tagline: "Always free. Start collecting today.",
    monthly: 0,
    yearly: 0,
    icon: Star,
    cta: "Get started",
    features: [
      "25 scans per month",
      "Up to 100 items in collection",
      "Basic valuations (delayed 24h)",
      "View community feed + post",
      "3 trade requests per month",
      "Single category (TCG, Sports, or LEGO)",
    ],
  },
  {
    key: "seeker",
    name: "Grail Seeker",
    tagline: "For serious collectors who want it all.",
    monthly: 12.99,
    yearly: 109,
    highlight: true,
    icon: Sparkles,
    cta: "Upgrade now",
    features: [
      "Unlimited scans",
      "Unlimited collection size",
      "Real-time market valuations",
      "All 3 categories (TCG + Sports + LEGO)",
      "Full community access + private messaging",
      "Unlimited trade requests + trade history",
      "Basic portfolio analytics",
      "Price drop / spike alerts",
    ],
  },
  {
    key: "master",
    name: "Grail Master",
    tagline: "Pro tools for power users and resellers.",
    monthly: 24.99,
    yearly: 199,
    icon: Crown,
    cta: "Go pro",
    features: [
      "Everything in Grail Seeker, plus:",
      "Bulk scan + batch edit tools",
      "Advanced analytics (ROI tracking, trend forecasting)",
      "Export collection data (CSV / PDF)",
      "Ad-free experience",
      "Priority support",
      "Early access to new features",
      "Custom collection tags / categories",
    ],
  },
];

function annualSavings(monthly: number, yearly: number): number {
  if (!monthly || !yearly) return 0;
  const fullYear = monthly * 12;
  return Math.round(((fullYear - yearly) / fullYear) * 100);
}

function formatPrice(amount: number): string {
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export default function BillingPage() {
  const { data: me } = useGetMe();
  const { data: plans, isLoading } = useListBillingPlans();
  const checkout = useCreateCheckout();
  const portal = useCreateBillingPortal();

  const [interval, setInterval] = useState<Interval>("year");
  const isPremium = me?.profile.tier === "premium";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("checkout");
    if (c === "success") {
      toast.success("Welcome to Premium", {
        description: "Your subscription is active.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (c === "canceled") {
      toast("Checkout canceled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Map the configured Stripe premium price to the Seeker tier.
  // Master tier doesn't have a Stripe product yet — show "Coming soon".
  const stripePremium: Record<Interval, BillingPlan | undefined> = useMemo(
    () => ({
      month: (plans ?? []).find(
        (p) => p.tier === "premium" && p.interval === "month",
      ),
      year: (plans ?? []).find(
        (p) => p.tier === "premium" && p.interval === "year",
      ),
    }),
    [plans],
  );

  const startCheckout = (planId: string) => {
    checkout.mutate(
      { data: { planId } },
      {
        onSuccess: (res) => {
          if (res.url) window.location.href = res.url;
        },
        onError: (e: unknown) => {
          const err = e as { data?: { error?: string } };
          toast.error(err.data?.error ?? "Could not start checkout");
        },
      },
    );
  };

  const openPortal = () => {
    portal.mutate(undefined, {
      onSuccess: (res) => {
        if (res.url) window.location.href = res.url;
      },
      onError: () => toast.error("Could not open portal"),
    });
  };

  const seekerSavings = annualSavings(12.99, 109);
  const masterSavings = annualSavings(24.99, 199);
  const headlineSavings = Math.max(seekerSavings, masterSavings);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
          Choose your tier
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          Built for collectors of TCG, sports cards, and LEGO. Start free, level
          up when you're ready.
        </p>
      </div>

      {/* Premium portal banner */}
      {isPremium && (
        <Card>
          <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-serif text-lg md:text-xl">
                You're a premium collector
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your subscription, invoices, and payment method.
              </p>
            </div>
            <Button
              onClick={openPortal}
              disabled={portal.isPending}
              className="w-full sm:w-auto"
            >
              {portal.isPending ? "Opening…" : "Manage subscription"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center">
        <div
          role="tablist"
          aria-label="Billing interval"
          className="inline-flex items-center gap-1 rounded-full border bg-card p-1 shadow-sm"
        >
          <button
            role="tab"
            aria-selected={interval === "month"}
            onClick={() => setInterval("month")}
            data-testid="interval-month"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              interval === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            role="tab"
            aria-selected={interval === "year"}
            onClick={() => setInterval("year")}
            data-testid="interval-year"
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              interval === "year"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                interval === "year"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              Save {headlineSavings}%
            </span>
          </button>
        </div>
      </div>

      {/* Tier grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[480px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.key}
              tier={tier}
              interval={interval}
              isPremium={isPremium}
              stripePlan={tier.key === "seeker" ? stripePremium[interval] : undefined}
              checkoutPending={checkout.isPending}
              onStartCheckout={startCheckout}
              onOpenPortal={openPortal}
            />
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="text-center text-xs text-muted-foreground">
        Cancel anytime. Prices in USD. Taxes may apply at checkout.
      </p>
    </div>
  );
}

function TierCard({
  tier,
  interval,
  isPremium,
  stripePlan,
  checkoutPending,
  onStartCheckout,
  onOpenPortal,
}: {
  tier: Tier;
  interval: Interval;
  isPremium: boolean;
  stripePlan: BillingPlan | undefined;
  checkoutPending: boolean;
  onStartCheckout: (planId: string) => void;
  onOpenPortal: () => void;
}) {
  const Icon = tier.icon;
  const isFree = tier.key === "scout";
  const isSeeker = tier.key === "seeker";
  const isMaster = tier.key === "master";
  // Prefer Stripe's actual price when wired so the displayed amount always
  // matches what the user will be charged at checkout. Fall back to the
  // marketing price from the tier spec if Stripe hasn't been configured yet.
  const marketingPrice = interval === "month" ? tier.monthly : tier.yearly;
  const stripePrice =
    isSeeker && stripePlan ? stripePlan.priceCents / 100 : null;
  const price = stripePrice ?? marketingPrice;
  const savings =
    tier.monthly && tier.yearly && interval === "year"
      ? annualSavings(tier.monthly, tier.yearly)
      : 0;

  // Per-month equivalent shown under annual price
  const yearlyForEquivalent = stripePrice ?? tier.yearly;
  const perMonthEquivalent =
    interval === "year" && yearlyForEquivalent && yearlyForEquivalent > 0
      ? yearlyForEquivalent / 12
      : null;

  return (
    <Card
      data-testid={`tier-${tier.key}`}
      className={`relative flex flex-col ${
        tier.highlight
          ? "border-primary shadow-lg ring-2 ring-primary/30 md:-translate-y-2"
          : ""
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="px-3 py-1 text-xs uppercase tracking-wider shadow">
            Most Popular
          </Badge>
        </div>
      )}
      <CardContent className="flex flex-col h-full p-6 md:p-7">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              tier.highlight
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-serif text-xl md:text-2xl">{tier.name}</span>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{tier.tagline}</p>

        {/* Price */}
        <div className="mt-5 min-h-[88px]">
          {isFree ? (
            <>
              <div className="font-serif text-4xl md:text-5xl">Free</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Forever, no card required
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-4xl md:text-5xl">
                  {price !== null ? formatPrice(price) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{interval === "month" ? "mo" : "yr"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {interval === "year" && perMonthEquivalent !== null ? (
                  <>
                    ≈ ${perMonthEquivalent.toFixed(2)}/mo
                    {savings > 0 && (
                      <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                        Save {savings}%
                      </span>
                    )}
                  </>
                ) : (
                  "Billed monthly, cancel anytime"
                )}
              </p>
            </>
          )}
        </div>

        {/* Features */}
        <ul className="mt-6 space-y-2.5 flex-1">
          {tier.features.map((feature, idx) => {
            const isPlusHeader =
              isMaster && idx === 0 && feature.endsWith("plus:");
            if (isPlusHeader) {
              return (
                <li
                  key={feature}
                  className="text-sm font-medium text-foreground pb-1"
                >
                  {feature}
                </li>
              );
            }
            return (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <Check
                  className={`size-4 mt-0.5 shrink-0 ${
                    tier.highlight ? "text-primary" : "text-emerald-500"
                  }`}
                />
                <span>{feature}</span>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <div className="mt-7">
          {isFree ? (
            <Button
              variant="outline"
              disabled
              className="w-full"
              data-testid={`cta-${tier.key}`}
            >
              {isPremium ? "Included" : "Current plan"}
            </Button>
          ) : isMaster ? (
            // Master tier — no Stripe product wired yet, always disabled.
            <Button
              variant="outline"
              className="w-full"
              disabled
              data-testid={`cta-${tier.key}`}
            >
              Coming soon
            </Button>
          ) : isPremium ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={onOpenPortal}
              data-testid={`cta-${tier.key}`}
            >
              Manage in portal
            </Button>
          ) : isSeeker && stripePlan ? (
            <Button
              className="w-full"
              onClick={() => onStartCheckout(stripePlan.id)}
              disabled={checkoutPending}
              data-testid={`cta-${tier.key}`}
            >
              {checkoutPending ? "Loading…" : tier.cta}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled
              data-testid={`cta-${tier.key}`}
            >
              Coming soon
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
