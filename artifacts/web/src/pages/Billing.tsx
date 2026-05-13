import { useEffect } from "react";
import {
  useListBillingPlans,
  useGetMe,
  useCreateCheckout,
  useCreateBillingPortal,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const { data: me } = useGetMe();
  const { data: plans, isLoading } = useListBillingPlans();
  const checkout = useCreateCheckout();
  const portal = useCreateBillingPortal();

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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the plan that fits how you collect.
        </p>
      </div>

      {isPremium && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="font-serif text-xl">You're on Premium</div>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your subscription, invoices, and payment method.
              </p>
            </div>
            <Button onClick={openPortal} disabled={portal.isPending}>
              {portal.isPending ? "Opening…" : "Manage subscription"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {(plans ?? []).map((p) => {
            const featured = p.interval === "year" && p.tier === "premium";
            return (
              <Card
                key={p.id}
                className={featured ? "border-primary/40 ring-1 ring-primary/20" : ""}
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="font-serif text-xl">{p.name}</div>
                    {featured && <Badge>Best value</Badge>}
                  </div>
                  <div className="mt-4">
                    <span className="font-serif text-4xl">
                      ${(p.priceCents / 100).toFixed(2)}
                    </span>
                    {p.interval !== "none" && (
                      <span className="text-sm text-muted-foreground ml-1">
                        /{p.interval}
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2 flex-1">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {p.tier === "free" ? (
                      <Button
                        variant="outline"
                        disabled
                        className="w-full"
                      >
                        {isPremium ? "Downgrade via portal" : "Current plan"}
                      </Button>
                    ) : isPremium ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={openPortal}
                      >
                        Switch via portal
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => startCheckout(p.id)}
                        disabled={checkout.isPending}
                      >
                        {checkout.isPending ? "Loading…" : `Get ${p.name}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isPremium && plans && plans.length === 1 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Premium plans aren't ready yet. Connect Stripe in the Integrations
              panel to enable checkout.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
