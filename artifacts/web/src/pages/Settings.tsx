import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Eye, User, Mail, Save } from "lucide-react";

type ToggleRow = {
  key: string;
  label: string;
  desc: string;
};

const PRICE_TOGGLES: ToggleRow[] = [
  {
    key: "watchlistDrop",
    label: "Watchlist price-drop alerts",
    desc: "Alert when a watchlisted item drops below your threshold",
  },
  {
    key: "priceDrop",
    label: "Price drop alerts",
    desc: "Alert when tracked items drop in value",
  },
  {
    key: "priceRise",
    label: "Price rise alerts",
    desc: "Alert when tracked items rise in value",
  },
];

const ACTIVITY_TOGGLES: ToggleRow[] = [
  {
    key: "newListing",
    label: "New listing alerts",
    desc: "Alert when new items match your saved searches",
  },
  {
    key: "tradeUpdates",
    label: "Trade & offer updates",
    desc: "Alert on new offers, counters, and trade responses",
  },
];

const DISPLAY_TOGGLES: ToggleRow[] = [
  {
    key: "showPortfolioValue",
    label: "Show portfolio value on dashboard",
    desc: "Display total value prominently on your dashboard",
  },
  {
    key: "showRoi",
    label: "Show ROI percentage",
    desc: "Display gain/loss as a percentage next to values",
  },
  {
    key: "compactCards",
    label: "Compact card view",
    desc: "Smaller card tiles in the collection grid",
  },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const;

const SECTIONS = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "display", label: "Display", icon: Eye },
  { id: "account", label: "Account", icon: User },
];

const INITIAL_NOTIFY: Record<string, boolean> = {
  watchlistDrop: true,
  priceDrop: true,
  priceRise: false,
  newListing: false,
  tradeUpdates: true,
};

const INITIAL_DISPLAY: Record<string, boolean> = {
  showPortfolioValue: true,
  showRoi: true,
  compactCards: false,
};

export default function SettingsPage() {
  const { data: me } = useGetMe();

  const [notifyEmail, setNotifyEmail] = useState("");
  const [frequency, setFrequency] = useState("instant");
  const [currency, setCurrency] = useState("USD");
  const [notify, setNotify] = useState<Record<string, boolean>>(INITIAL_NOTIFY);
  const [display, setDisplay] = useState<Record<string, boolean>>(INITIAL_DISPLAY);
  const [savedSnapshot, setSavedSnapshot] = useState({
    notifyEmail: "",
    frequency: "instant",
    currency: "USD",
    notify: INITIAL_NOTIFY,
    display: INITIAL_DISPLAY,
  });

  const dirty =
    notifyEmail !== savedSnapshot.notifyEmail ||
    frequency !== savedSnapshot.frequency ||
    currency !== savedSnapshot.currency ||
    JSON.stringify(notify) !== JSON.stringify(savedSnapshot.notify) ||
    JSON.stringify(display) !== JSON.stringify(savedSnapshot.display);

  const onSave = () => {
    setSavedSnapshot({ notifyEmail, frequency, currency, notify, display });
    toast.success("Settings saved!");
  };

  const onReset = () => {
    setNotifyEmail(savedSnapshot.notifyEmail);
    setFrequency(savedSnapshot.frequency);
    setCurrency(savedSnapshot.currency);
    setNotify(savedSnapshot.notify);
    setDisplay(savedSnapshot.display);
  };

  const ToggleRow = ({
    row,
    state,
    setState,
  }: {
    row: ToggleRow;
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
    rows: ToggleRow[];
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
        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="font-serif text-xl">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto pb-28">
      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage notifications, display preferences, and your account.
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
                    <Label
                      htmlFor="notify-email"
                      className="text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      Notification Email
                    </Label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        id="notify-email"
                        type="email"
                        placeholder="you@example.com"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Defaults to your login email
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
                    <p className="text-xs text-muted-foreground">
                      How often we group your alerts
                    </p>
                  </div>
                </div>

                <ToggleGroup
                  title="Price alerts"
                  rows={PRICE_TOGGLES}
                  state={notify}
                  setState={setNotify}
                />
                <ToggleGroup
                  title="Activity"
                  rows={ACTIVITY_TOGGLES}
                  state={notify}
                  setState={setNotify}
                />
              </div>
            </CardContent>
          </Card>

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
                    <p className="text-xs text-muted-foreground">
                      Used everywhere values are shown
                    </p>
                  </div>
                </div>
                <ToggleGroup rows={DISPLAY_TOGGLES} state={display} setState={setDisplay} />
              </div>
            </CardContent>
          </Card>

          <Card id="account" className="scroll-mt-20">
            <CardContent className="p-6">
              <SectionHeader
                icon={User}
                title="Account"
                desc="Read-only details from your GrailBabe profile."
              />
              <dl className="divide-y divide-border rounded-md border">
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">user@example.com</dd>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Display Name</dt>
                  <dd className="text-sm font-medium">Your Name</dd>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Member Since</dt>
                  <dd className="text-sm font-medium">—</dd>
                </div>
                <div className="flex items-center justify-between gap-4 p-4">
                  <dt className="text-sm text-muted-foreground">Plan</dt>
                  <dd>
                    <Badge
                      className="uppercase tracking-wide"
                      variant={me?.profile.tier === "premium" ? "default" : "secondary"}
                    >
                      {me?.profile.tier ?? "Free"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-60 right-0 border-t border-border bg-background/95 backdrop-blur transition-transform z-20 ${
          dirty ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            You have unsaved changes
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onReset}>
              Discard
            </Button>
            <Button onClick={onSave}>
              <Save className="size-4 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
