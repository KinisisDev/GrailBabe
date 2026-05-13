import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Plus, Search } from "lucide-react";

type CategoryKey = "tcg" | "lego" | "sports";
type StatusKey = "open" | "pending";
type AvatarColor = "blue" | "green" | "amber" | "purple" | "coral" | "teal";

type Trade = {
  id: string;
  status: StatusKey;
  category: CategoryKey;
  subCategory: string;
  have: { name: string; detail: string };
  want: { name: string; detail: string; openToOffers?: boolean };
  user: { initials: string; name: string; colorClass: AvatarColor };
  postedAt: string;
  zip: string;
};

const MOCK_TRADES: Trade[] = [
  {
    id: "1",
    status: "open",
    category: "tcg",
    subCategory: "Pokémon",
    have: { name: "Charizard Holo", detail: "Base Set · PSA 9" },
    want: { name: "Blastoise Holo", detail: "Base Set · PSA 8+", openToOffers: false },
    user: { initials: "SK", name: "Sarah K.", colorClass: "blue" },
    postedAt: "2m ago",
    zip: "90210",
  },
  {
    id: "2",
    status: "open",
    category: "lego",
    subCategory: "LEGO",
    have: { name: "Millennium Falcon", detail: "#75192 · Sealed" },
    want: { name: "", detail: "LEGO Star Wars preferred", openToOffers: true },
    user: { initials: "MT", name: "Mike T.", colorClass: "green" },
    postedAt: "18m ago",
    zip: "10001",
  },
  {
    id: "3",
    status: "pending",
    category: "sports",
    subCategory: "Baseball",
    have: { name: "Mike Trout RC", detail: "2011 Topps · BGS 9.5" },
    want: { name: "Shohei Ohtani RC", detail: "2018 Topps · PSA 10", openToOffers: false },
    user: { initials: "JL", name: "Jordan L.", colorClass: "amber" },
    postedAt: "1h ago",
    zip: "60601",
  },
  {
    id: "4",
    status: "open",
    category: "tcg",
    subCategory: "Yu-Gi-Oh",
    have: { name: "Blue-Eyes White Dragon", detail: "1st Edition · PSA 8" },
    want: { name: "Dark Magician", detail: "1st Edition · Any grade", openToOffers: false },
    user: { initials: "AR", name: "Alex R.", colorClass: "purple" },
    postedAt: "3h ago",
    zip: "77001",
  },
  {
    id: "5",
    status: "open",
    category: "lego",
    subCategory: "LEGO",
    have: { name: "Eiffel Tower", detail: "#10307 · Complete" },
    want: { name: "Colosseum", detail: "#10276 · Sealed preferred", openToOffers: false },
    user: { initials: "PW", name: "Parker W.", colorClass: "coral" },
    postedAt: "5h ago",
    zip: "30301",
  },
  {
    id: "6",
    status: "open",
    category: "tcg",
    subCategory: "MTG",
    have: { name: "Black Lotus", detail: "Alpha · PSA 7" },
    want: { name: "", detail: "Mox preferred or cash add", openToOffers: true },
    user: { initials: "CM", name: "Chris M.", colorClass: "teal" },
    postedAt: "Yesterday",
    zip: "98101",
  },
  {
    id: "7",
    status: "open",
    category: "sports",
    subCategory: "Basketball",
    have: { name: "LeBron James RC", detail: "2003 Topps Chrome · PSA 9" },
    want: { name: "Kobe Bryant RC", detail: "1996 Topps Chrome · PSA 8+" },
    user: { initials: "DW", name: "Dana W.", colorClass: "blue" },
    postedAt: "2 days ago",
    zip: "90210",
  },
  {
    id: "8",
    status: "open",
    category: "tcg",
    subCategory: "Lorcana",
    have: { name: "Elsa - Spirit of Winter", detail: "Enchanted · Near Mint" },
    want: { name: "", detail: "Any Enchanted Lorcana", openToOffers: true },
    user: { initials: "BN", name: "Britt N.", colorClass: "purple" },
    postedAt: "3 days ago",
    zip: "85001",
  },
];

const CURRENT_USER_ZIP = "90210";

const ZIP_COORDS: Record<string, [number, number]> = {
  "90210": [34.0901, -118.4065],
  "10001": [40.7506, -73.9972],
  "60601": [41.8855, -87.6217],
  "77001": [29.7604, -95.3698],
  "30301": [33.749, -84.388],
  "98101": [47.6101, -122.3344],
  "85001": [33.4484, -112.074],
};

function zipDistanceMiles(a: string, b: string): number | null {
  const A = ZIP_COORDS[a];
  const B = ZIP_COORDS[b];
  if (!A || !B) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lon1] = A;
  const [lat2, lon2] = B;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return 3958.8 * c;
}

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  tcg: "TCG",
  lego: "LEGO",
  sports: "Sports",
};

const CATEGORY_NEON: Record<CategoryKey, string> = {
  tcg: "var(--neon-blue)",
  lego: "var(--neon-green)",
  sports: "var(--neon-yellow)",
};

const AVATAR_NEON: Record<AvatarColor, string> = {
  blue: "var(--neon-blue)",
  green: "var(--neon-green)",
  amber: "var(--neon-yellow)",
  purple: "#b66cff",
  coral: "var(--neon-red)",
  teal: "#2ee6d6",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "tcg", label: "TCG" },
  { key: "lego", label: "LEGO" },
  { key: "sports", label: "Sports Cards" },
  { key: "watchlist", label: "My Watchlist" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

type SortKey = "newest" | "activity" | "near";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [radius, setRadius] = useState<string>("any");
  const [open, setOpen] = useState(false);

  // Post trade form state
  const [form, setForm] = useState({
    category: "tcg" as CategoryKey,
    subCategory: "",
    haveName: "",
    haveDetail: "",
    openToOffers: false,
    wantName: "",
    wantDetail: "",
    zip: "",
  });

  const visible = useMemo(() => {
    let list = trades.slice();
    if (filter === "watchlist") {
      list = list.filter((t) => t.category === "tcg");
    } else if (filter !== "all") {
      list = list.filter((t) => t.category === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.have.name.toLowerCase().includes(q) ||
          t.want.name.toLowerCase().includes(q),
      );
    }
    if (sort === "activity") {
      list = list.slice().reverse();
    } else if (sort === "near") {
      const withDist = list.map((t) => ({
        t,
        d: zipDistanceMiles(CURRENT_USER_ZIP, t.zip) ?? Infinity,
      }));
      const radiusNum = radius === "any" ? Infinity : Number(radius);
      list = withDist
        .filter((x) => x.d <= radiusNum)
        .sort((a, b) => a.d - b.d)
        .map((x) => x.t);
    }
    return list;
  }, [trades, filter, search, sort, radius]);

  const submit = () => {
    if (!form.haveName.trim()) return;
    const id = String(Date.now());
    const newTrade: Trade = {
      id,
      status: "open",
      category: form.category,
      subCategory: form.subCategory || CATEGORY_LABEL[form.category],
      have: { name: form.haveName, detail: form.haveDetail },
      want: form.openToOffers
        ? { name: "", detail: form.wantDetail || "Open to offers", openToOffers: true }
        : { name: form.wantName, detail: form.wantDetail },
      user: { initials: "ME", name: "You", colorClass: "blue" },
      postedAt: "Just now",
      zip: form.zip || CURRENT_USER_ZIP,
    };
    setTrades([newTrade, ...trades]);
    setForm({
      category: "tcg",
      subCategory: "",
      haveName: "",
      haveDetail: "",
      openToOffers: false,
      wantName: "",
      wantDetail: "",
      zip: "",
    });
    setOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Trading board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and post item trades with other collectors.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Post a trade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Active listings", value: 248 },
          { label: "New today", value: 34 },
          { label: "Completed trades", value: 91 },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="font-serif text-2xl mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="activity">Most recent activity</SelectItem>
            <SelectItem value="near">Near me</SelectItem>
          </SelectContent>
        </Select>
        {sort === "near" && (
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">Within 25 miles</SelectItem>
              <SelectItem value="50">Within 50 miles</SelectItem>
              <SelectItem value="100">Within 100 miles</SelectItem>
              <SelectItem value="any">Any distance</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No trades match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((t) => (
            <TradeCard key={t.id} trade={t} showDistance={sort === "near"} />
          ))}
        </div>
      )}

      {/* Post Trade Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Post a trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as CategoryKey })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcg">TCG</SelectItem>
                    <SelectItem value="lego">LEGO</SelectItem>
                    <SelectItem value="sports">Sports Cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sub-category
                </Label>
                <Input
                  placeholder="Pokémon, Star Wars…"
                  value={form.subCategory}
                  onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Have
              </div>
              <Input
                placeholder="Item name"
                value={form.haveName}
                onChange={(e) => setForm({ ...form, haveName: e.target.value })}
              />
              <Input
                placeholder="Condition / grade (e.g. PSA 9, Sealed)"
                value={form.haveDetail}
                onChange={(e) => setForm({ ...form, haveDetail: e.target.value })}
              />
            </div>

            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Want
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={form.openToOffers}
                    onCheckedChange={(v) =>
                      setForm({ ...form, openToOffers: !!v })
                    }
                  />
                  Open to offers
                </label>
              </div>
              <Input
                placeholder="Item name"
                value={form.wantName}
                onChange={(e) => setForm({ ...form, wantName: e.target.value })}
                disabled={form.openToOffers}
              />
              <Input
                placeholder="Condition / grade"
                value={form.wantDetail}
                onChange={(e) => setForm({ ...form, wantDetail: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Your zip code
              </Label>
              <Input
                inputMode="numeric"
                maxLength={5}
                placeholder="90210"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!form.haveName.trim()}>
              Post trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeCard({
  trade,
  showDistance,
}: {
  trade: Trade;
  showDistance: boolean;
}) {
  const catNeon = CATEGORY_NEON[trade.category];
  const userNeon = AVATAR_NEON[trade.user.colorClass];
  const distance = showDistance ? zipDistanceMiles(CURRENT_USER_ZIP, trade.zip) : null;
  const isPending = trade.status === "pending";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide"
              style={{
                borderColor: `color-mix(in srgb, ${catNeon} 50%, transparent)`,
                color: catNeon,
                backgroundColor: `color-mix(in srgb, ${catNeon} 10%, transparent)`,
              }}
            >
              {trade.subCategory}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide"
              style={{
                borderColor: `color-mix(in srgb, ${
                  isPending ? "var(--neon-yellow)" : "var(--neon-green)"
                } 50%, transparent)`,
                color: isPending ? "var(--neon-yellow)" : "var(--neon-green)",
                backgroundColor: `color-mix(in srgb, ${
                  isPending ? "var(--neon-yellow)" : "var(--neon-green)"
                } 12%, transparent)`,
              }}
            >
              {isPending ? "Pending" : "Open"}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">{trade.postedAt}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <div className="rounded-md bg-muted/50 border border-border p-3 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Have
            </div>
            <div className="text-sm font-semibold truncate mt-1">{trade.have.name}</div>
            <div className="text-xs text-muted-foreground truncate">{trade.have.detail}</div>
          </div>
          <div className="self-center text-muted-foreground">
            <ArrowRight className="size-4" />
          </div>
          <div className="rounded-md border border-dashed border-border p-3 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Want
            </div>
            {trade.want.openToOffers ? (
              <>
                <div className="text-sm italic mt-1">Open to offers</div>
                <div className="text-xs text-muted-foreground truncate">
                  {trade.want.detail}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold truncate mt-1">{trade.want.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {trade.want.detail}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="size-8 rounded-full grid place-items-center text-xs font-semibold shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${userNeon} 22%, transparent)`,
                color: userNeon,
              }}
            >
              {trade.user.initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{trade.user.name}</div>
              {distance != null && Number.isFinite(distance) && (
                <div className="text-[10px] text-muted-foreground">
                  ~{Math.round(distance)} miles away
                </div>
              )}
            </div>
          </div>
          {isPending ? (
            <span className="text-xs text-muted-foreground">Pending</span>
          ) : (
            <Link href="/messages">
              <Button size="sm">Make offer</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
