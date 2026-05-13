import { Link, useParams } from "wouter";
import {
  useGetMyProfile,
  useGetProfile,
  getGetMyProfileQueryKey,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageCircle,
  ArrowLeftRight,
  Pencil,
  Star,
  Box,
  Sparkles,
  MessagesSquare,
} from "lucide-react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatLocation(p: {
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country: string;
}) {
  if (!p.city && !p.region) return null;
  const cityRegion = [p.city, p.region].filter(Boolean).join(", ");
  if (p.country === "US") {
    return [cityRegion, p.postalCode].filter(Boolean).join(" ");
  }
  return [cityRegion, p.country].filter(Boolean).join(", ");
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d`;
  return new Date(d).toLocaleDateString();
}

export default function Profile() {
  const params = useParams<{ screenname?: string }>();
  const screenname = params.screenname;

  const { data: me } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      staleTime: 30_000,
      retry: false,
    },
  });

  const isOwn = !screenname || screenname === me?.screenname;
  const lookupName = screenname ?? me?.screenname ?? "";

  const { data: profile, isLoading, isError } = useGetProfile(lookupName, {
    query: {
      queryKey: getGetProfileQueryKey(lookupName),
      enabled: Boolean(lookupName),
      retry: false,
    },
  });

  if (!lookupName && me && !me.screenname) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            Finish onboarding to set up your profile.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <h1 className="font-serif text-xl">Profile not found</h1>
            <p className="text-sm text-muted-foreground mt-1">
              We couldn't find @{lookupName}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loc = formatLocation(profile);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-16">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div
              className="size-24 rounded-full grid place-items-center shrink-0 text-2xl font-semibold text-black"
              style={{
                background:
                  "linear-gradient(135deg, var(--neon-blue), var(--neon-green))",
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="size-full object-cover rounded-full"
                />
              ) : (
                initials(profile.displayName)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1
                  className="font-serif text-3xl tracking-tight"
                  data-testid="text-display-name"
                >
                  {profile.displayName}
                </h1>
                <span className="text-muted-foreground" data-testid="text-screenname">
                  @{profile.screenname}
                </span>
              </div>
              {profile.formerScreenname && (
                <div className="text-xs italic text-muted-foreground mt-0.5">
                  formerly @{profile.formerScreenname}
                </div>
              )}
              {loc && (
                <div className="text-sm text-muted-foreground mt-2">{loc}</div>
              )}
              {profile.bio && (
                <p className="text-sm mt-3 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Member since {profile.memberSinceYear}</span>
                {profile.categories.length > 0 && (
                  <>
                    <span>·</span>
                    <span>Collects {profile.categories.join(", ")}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {isOwn ? (
                  <Link href="/settings">
                    <Button size="sm" data-testid="button-edit-profile">
                      <Pencil className="size-3.5 mr-1.5" />
                      Edit profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/messages?conversation=${profile.id}`}>
                      <Button size="sm" data-testid="button-message">
                        <MessageCircle className="size-3.5 mr-1.5" />
                        Message
                      </Button>
                    </Link>
                    <Link href={`/trades?user=${profile.screenname}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid="button-view-trades"
                      >
                        <ArrowLeftRight className="size-3.5 mr-1.5" />
                        View Trades
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Items in vault", value: profile.vaultItemCount },
          {
            label: "Est. value",
            value: `$${Number(profile.estimatedVaultValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          },
          { label: "Trades completed", value: profile.tradesCompleted },
          {
            label: "Trade rep",
            value:
              profile.tradeRepScore > 0
                ? `${profile.tradeRepScore.toFixed(1)} ★`
                : "—",
          },
          { label: "Community posts", value: profile.communityPostCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xl font-semibold tabular-nums">
                {s.value}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl flex items-center gap-2">
                  <Box className="size-4 text-primary" />
                  Featured vault items
                </h2>
                {isOwn && (
                  <Link
                    href="/vault"
                    className="text-xs text-primary hover:underline"
                  >
                    See full vault →
                  </Link>
                )}
              </div>
              {profile.featuredVaultItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items yet.
                </p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  {profile.featuredVaultItems.map((it) => (
                    <div
                      key={it.id}
                      className="rounded-md border border-border overflow-hidden"
                    >
                      <div className="aspect-square bg-muted/40 grid place-items-center">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Sparkles className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-sm font-medium truncate">
                          {it.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {it.condition ?? it.category}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl flex items-center gap-2">
                  <MessagesSquare className="size-4 text-primary" />
                  Recent posts
                </h2>
                <Link
                  href="/community"
                  className="text-xs text-primary hover:underline"
                >
                  See all posts →
                </Link>
              </div>
              {profile.recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No posts yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {profile.recentPosts.map((p) => (
                    <li key={p.id} className="py-3 flex items-start gap-3">
                      <div className="text-sm tabular-nums w-10 text-center text-muted-foreground">
                        {p.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/community/${p.id}`}
                          className="text-sm font-medium hover:underline block truncate"
                        >
                          {p.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {p.category}
                          </Badge>
                          <span>{p.commentCount} replies</span>
                          <span>·</span>
                          <span>{timeAgo(p.createdAt)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl flex items-center gap-2">
                  <Star className="size-4 text-primary" />
                  Grail list
                </h2>
                {isOwn && (
                  <Link
                    href="/grail"
                    className="text-xs text-primary hover:underline"
                  >
                    See all →
                  </Link>
                )}
              </div>
              {profile.grailList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grails listed.</p>
              ) : (
                <ul className="space-y-2">
                  {profile.grailList.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-start justify-between gap-3 p-2 rounded-md hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {g.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {g.category}
                          {g.targetPrice ? ` · $${g.targetPrice}` : ""}
                        </div>
                      </div>
                      <Badge
                        variant={g.acquired ? "default" : "outline"}
                        className="text-[10px] shrink-0"
                      >
                        {g.acquired ? "Found" : "Hunting"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-serif text-xl flex items-center gap-2 mb-3">
                <Star className="size-4 text-primary" />
                Trade reputation
              </h2>
              <div className="text-sm text-muted-foreground">
                {profile.tradesCompleted === 0 ? (
                  <p>No completed trades yet.</p>
                ) : (
                  <p>
                    {profile.tradeRepScore.toFixed(1)} ★ ·{" "}
                    {profile.tradesCompleted} trades
                  </p>
                )}
              </div>
              {profile.recentTradeReviews.length > 0 && (
                <ul className="space-y-3 mt-3">
                  {profile.recentTradeReviews.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm border-l-2 border-primary/40 pl-3"
                    >
                      <div className="text-xs text-muted-foreground">
                        {r.reviewer} · {r.stars}★
                      </div>
                      <div className="italic">"{r.quote}"</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
