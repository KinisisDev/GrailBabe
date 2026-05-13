import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ToggleRow = {
  key: string;
  label: string;
  desc: string;
};

const NOTIFY_TOGGLES: ToggleRow[] = [
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

export default function SettingsPage() {
  const { data: me } = useGetMe();

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

  const onSave = () => {
    toast.success("Settings saved!");
  };

  const ToggleList = ({
    rows,
    state,
    setState,
  }: {
    rows: ToggleRow[];
    state: Record<string, boolean>;
    setState: (next: Record<string, boolean>) => void;
  }) => (
    <div className="divide-y divide-border rounded-md border">
      {rows.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="text-sm font-medium">{row.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{row.desc}</div>
          </div>
          <Switch
            checked={!!state[row.key]}
            onCheckedChange={(v) => setState({ ...state, [row.key]: v })}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage notifications, display preferences, and your account.
          </p>
        </div>
        <Button onClick={onSave}>Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Email Notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            We'll send alerts to your registered email address.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Notification Email
              </Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This email receives all alerts (defaults to your login email)
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
                  <SelectItem value="instant">Instant — as soon as it happens</SelectItem>
                  <SelectItem value="daily">Daily digest — once per day</SelectItem>
                  <SelectItem value="weekly">Weekly digest — once per week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ToggleList rows={NOTIFY_TOGGLES} state={notify} setState={setNotify} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Display Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
          <ToggleList rows={DISPLAY_TOGGLES} state={display} setState={setDisplay} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </Label>
              <Input value="user@example.com" readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Display Name
              </Label>
              <Input value="Your Name" readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Member Since
              </Label>
              <Input value="—" readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Plan
              </Label>
              <div className="h-9 flex items-center">
                <Badge
                  className="uppercase tracking-wide"
                  variant={me?.profile.tier === "premium" ? "default" : "secondary"}
                >
                  {me?.profile.tier ?? "Free"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave}>Save Changes</Button>
      </div>
    </div>
  );
}
