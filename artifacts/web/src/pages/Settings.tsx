import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useUpdateProfile,
  useChangeScreenname,
  useCheckScreenname,
  getGetMyProfileQueryKey,
  getCheckScreennameQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  Eye,
  User,
  Mail,
  Save,
  MapPin,
  Loader2,
  Check,
  X,
  AtSign,
} from "lucide-react";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "OTHER", name: "Other" },
];

function regionLabelFor(country: string) {
  if (country === "US" || country === "AU") return "State";
  if (country === "CA") return "Province";
  if (country === "GB") return "County";
  return "Region";
}
function postalLabelFor(country: string) {
  if (country === "US") return "ZIP code";
  if (country === "GB" || country === "AU") return "Postcode";
  if (country === "CA") return "Postal code";
  return "Postal code";
}

const SCREENNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const COOLDOWN_DAYS = 120;

const PRICE_TOGGLES = [
  { key: "watchlistDrop", label: "Watchlist price-drop alerts", desc: "Alert when a watchlisted item drops below your threshold" },
  { key: "priceDrop", label: "Price drop alerts", desc: "Alert when tracked items drop in value" },
  { key: "priceRise", label: "Price rise alerts", desc: "Alert when tracked items rise in value" },
];
const ACTIVITY_TOGGLES = [
  { key: "newListing", label: "New listing alerts", desc: "Alert when new items match your saved searches" },
  { key: "tradeUpdates", label: "Trade & offer updates", desc: "Alert on new offers, counters, and trade responses" },
];
const DISPLAY_TOGGLES = [
  { key: "showPortfolioValue", label: "Show portfolio value on dashboard", desc: "Display total value prominently on your dashboard" },
  { key: "showRoi", label: "Show ROI percentage", desc: "Display gain/loss as a percentage next to values" },
  { key: "compactCards", label: "Compact card view", desc: "Smaller card tiles in the collection grid" },
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const;

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "location", label: "Location", icon: MapPin },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "display", label: "Display", icon: Eye },
  { id: "account", label: "Account", icon: User },
];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      staleTime: 30_000,
      retry: false,
    },
  });
  const update = useUpdateProfile();
  const changeScreenname = useChangeScreenname();

  // Local editable state hydrated from /profiles/me
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Notification + display preferences (local-only for now)
  const [notifyEmail, setNotifyEmail] = useState("");
  const [frequency, setFrequency] = useState("instant");
  const [currency, setCurrency] = useState("USD");
  const [notify, setNotify] = useState<Record<string, boolean>>({
    watchlistDrop: true,
    priceDrop: true,
    priceRise: false,
    newListing: false,
    tradeUpdates: true,
  });
  const [display, setDisplay] = useState<Record<string, boolean>>({
    showPortfolioValue: true,
    showRoi: true,
    compactCards: false,
  });

  useEffect(() => {
    if (!me) return;
    setDisplayName(me.displayName ?? "");
    setBio(me.bio ?? "");
    setCountry(me.country ?? "US");
    setCity(me.city ?? "");
    setRegion(me.region ?? "");
    setPostalCode(me.postalCode ?? "");
    setNotifyEmail(me.email ?? "");
  }, [me]);

  // Screenname change
  const lockDays = useMemo(() => {
    if (!me?.screennameChangedAt) return 0;
    const elapsedMs = Date.now() - new Date(me.screennameChangedAt).getTime();
    const remainingMs = COOLDOWN_DAYS * 86400000 - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 86400000));
  }, [me?.screennameChangedAt]);
  const canChangeScreenname = lockDays === 0;

  const [showScreennameForm, setShowScreennameForm] = useState(false);
  const [newScreenname, setNewScreenname] = useState("");
  const debouncedNew = useDebounced(newScreenname.trim(), 400);
  const formatValid =
    debouncedNew.length > 0 &&
    SCREENNAME_RE.test(debouncedNew) &&
    debouncedNew.toLowerCase() !== (me?.screenname ?? "").toLowerCase();
  const { data: avail, isFetching: checking } = useCheckScreenname(
    { screenname: debouncedNew },
    {
      query: {
        queryKey: getCheckScreennameQueryKey({ screenname: debouncedNew }),
        enabled: formatValid,
        retry: false,
        staleTime: 5_000,
      },
    },
  );
  const newStatus = useMemo<{
    kind: "neutral" | "valid" | "invalid";
    msg: string | null;
  }>(() => {
    if (!newScreenname) return { kind: "neutral", msg: null };
    const t = newScreenname.trim();
    if (t.length < 3) return { kind: "invalid", msg: "At least 3 characters" };
    if (t.length > 20) return { kind: "invalid", msg: "At most 20 characters" };
    if (!SCREENNAME_RE.test(t))
      return { kind: "invalid", msg: "Letters, numbers, and underscores only" };
    if (t.toLowerCase() === (me?.screenname ?? "").toLowerCase())
      return { kind: "invalid", msg: "Same as current" };
    if (debouncedNew !== t || checking)
      return { kind: "neutral", msg: "Checking…" };
    if (avail?.available) return { kind: "valid", msg: "Available" };
    if (avail && !avail.available)
      return { kind: "invalid", msg: avail.reason ?? "Already taken" };
    return { kind: "neutral", msg: null };
  }, [newScreenname, debouncedNew, avail, checking, me?.screenname]);

  const profileDirty =
    !!me &&
    (displayName !== (me.displayName ?? "") ||
      bio !== (me.bio ?? "") ||
      country !== (me.country ?? "US") ||
      city !== (me.city ?? "") ||
      region !== (me.region ?? "") ||
      postalCode !== (me.postalCode ?? ""));

  const onSave = () => {
    if (!profileDirty) {
      toast.success("Settings saved!");
      return;
    }
    update.mutate(
      {
        data: {
          displayName,
          bio: bio || null,
          country,
          city: city || null,
          region: region || null,
          postalCode: postalCode || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response
              ?.data?.error ?? "Could not save changes";
          toast.error(msg);
        },
      },
    );
  };

  const onConfirmScreenname = () => {
    changeScreenname.mutate(
      { data: { screenname: newScreenname.trim() } },
      {
        onSuccess: () => {
          toast.success("Screenname updated");
          setShowScreennameForm(false);
          setNewScreenname("");
          qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { error?: string; daysRemaining?: number } } })?.response?.data;
          if (data?.daysRemaining)
            toast.error(`Available to change in ${data.daysRemaining} days`);
          else toast.error(data?.error ?? "Could not change screenname");
        },
      },
    );
  };

  const ToggleRow = ({
    row,
    state,
    setState,
  }: {
    row: { key: string; label: string; desc: string };
    state: Record<string, boolean>;
    setState: (next: Record<string, boolean>) => void;
  }) => {
    const id = `tog-${row.key}`;
    return (
      <label
        htmlFor={id}
        className="flex items-start justify-between gap-4 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{row.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{row.desc}</div>
        </div>
        <Switch
          id={id}
          checked={!!state[row.key]}
          onCheckedChange={(v) => setState({ ...state, [row.key]: v })}
        />
      </label>
    );
  };

  const ToggleGroup = ({
    title,
    rows,
    state,
    setState,
  }: {
    title?: string;
    rows: { key: string; label: string; desc: string }[];
    state: Record<string, boolean>;
    setState: (next: Record<string, boolean>) => void;
  }) => (
    <div className="space-y-2">
      {title && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1">
          {title}
        </div>
      )}
      <div className="divide-y divide-border rounded-md border overflow-hidden">
        {rows.map((row) => (
          <ToggleRow key={row.key} row={row} state={state} setState={setState} />
        ))}
      </div>
    </div>
  );

  const SectionHeader = ({
    icon: Icon,
    title,
    desc,
  }: {
    icon: typeof Bell;
    title: string;
    desc?: string;
  }) => (
    <div className="flex items-start gap-3 mb-5">
      <div
        className="size-9 rounded-md grid place-items-center shrink-0 text-primary"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
        }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-12 grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pb-28">
      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, location, notifications, and account.
        </p>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-8">
        <nav className="hidden lg:block self-start sticky top-20 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                <Icon className="size-4" />
                {s.label}
              </a>
            );
          })}
        </nav>

        <div className="space-y-6 min-w-0">
          {/* PROFILE */}
          <Card id="profile" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader
                icon={User}
                title="Profile"
                desc="What other collectors see on your public profile."
              />
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Display name
                  </Label>
                  <Input
                    data-testid="input-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bio
                  </Label>
                  <Textarea
                    data-testid="input-bio"
                    value={bio}
                    onChange={(e) =>
                      setBio(e.target.value.slice(0, 200))
                    }
                    rows={3}
                    placeholder="Tell other collectors what you collect…"
                  />
                  <div className="text-[11px] text-muted-foreground text-right">
                    {bio.length}/200
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Screenname
                  </Label>
                  <div className="relative">
                    <AtSign className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      readOnly
                      value={me?.screenname ?? ""}
                      className={`pl-8 ${!canChangeScreenname ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                  </div>
                  {!canChangeScreenname ? (
                    <p className="text-xs text-muted-foreground">
                      Available to change in {lockDays} days.
                    </p>
                  ) : (
                    <>
                      {!showScreennameForm ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 h-auto"
                          onClick={() => setShowScreennameForm(true)}
                          data-testid="button-change-screenname"
                        >
                          Change screenname
                        </Button>
                      ) : (
                        <div className="mt-3 p-4 rounded-md border border-border bg-muted/30 space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                              New screenname
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                @
                              </span>
                              <Input
                                value={newScreenname}
                                onChange={(e) => setNewScreenname(e.target.value)}
                                className="pl-7"
                                maxLength={20}
                                data-testid="input-new-screenname"
                              />
                            </div>
                            {newStatus.msg && (
                              <div
                                className={`flex items-center gap-1.5 text-[13px] ${
                                  newStatus.kind === "valid"
                                    ? "text-[var(--neon-green)]"
                                    : newStatus.kind === "invalid"
                                      ? "text-[var(--neon-red)]"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {newStatus.kind === "valid" && <Check className="size-3.5" />}
                                {newStatus.kind === "invalid" && <X className="size-3.5" />}
                                {newStatus.kind === "neutral" && checking && <Loader2 className="size-3.5 animate-spin" />}
                                <span>{newStatus.msg}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            You won't be able to change this again for 120 days.
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={
                                newStatus.kind !== "valid" || changeScreenname.isPending
                              }
                              onClick={onConfirmScreenname}
                              data-testid="button-confirm-screenname"
                            >
                              {changeScreenname.isPending && (
                                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                              )}
                              Confirm change
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowScreennameForm(false);
                                setNewScreenname("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LOCATION */}
          <Card id="location" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader
                icon={MapPin}
                title="Location"
                desc="Used for local trade discovery. Street address is never shown."
              />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Country
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      City
                    </Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {regionLabelFor(country)}
                    </Label>
                    <Input
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      data-testid="input-region"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    {postalLabelFor(country)}{" "}
                    <span className="normal-case text-muted-foreground/70 ml-1">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    data-testid="input-postal"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NOTIFICATIONS */}
          <Card id="notifications" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader
                icon={Bell}
                title="Email Notifications"
                desc="We'll send alerts to your registered email address."
              />
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Notification Email
                    </Label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Never displayed on your public profile.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Notification Frequency
                    </Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant — as it happens</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="weekly">Weekly digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ToggleGroup title="Price alerts" rows={PRICE_TOGGLES} state={notify} setState={setNotify} />
                <ToggleGroup title="Activity" rows={ACTIVITY_TOGGLES} state={notify} setState={setNotify} />
              </div>
            </CardContent>
          </Card>

          {/* DISPLAY */}
          <Card id="display" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader icon={Eye} title="Display Preferences" />
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Display Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ToggleGroup rows={DISPLAY_TOGGLES} state={display} setState={setDisplay} />
              </div>
            </CardContent>
          </Card>

          {/* ACCOUNT */}
          <Card id="account" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader
                icon={User}
                title="Account"
                desc="Read-only details from your GrailBabe account."
              />
              <dl className="divide-y divide-border rounded-md border">
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">{me?.email ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Member since</dt>
                  <dd className="text-sm font-medium">
                    {me?.createdAt
                      ? new Date(me.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Plan</dt>
                  <dd>
                    <Badge
                      className="uppercase tracking-wide"
                      variant={me?.tier === "premium" ? "default" : "secondary"}
                    >
                      {me?.tier ?? "Free"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur transition-transform z-20 ${
          profileDirty ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            You have unsaved profile changes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (!me) return;
                setDisplayName(me.displayName ?? "");
                setBio(me.bio ?? "");
                setCountry(me.country ?? "US");
                setCity(me.city ?? "");
                setRegion(me.region ?? "");
                setPostalCode(me.postalCode ?? "");
              }}
            >
              Discard
            </Button>
            <Button onClick={onSave} disabled={update.isPending} data-testid="button-save-settings">
              {update.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Save className="size-4 mr-1.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
