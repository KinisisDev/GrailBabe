import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPosts,
  useCreatePost,
  useReactPost,
  type ForumPost,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MessageSquare,
  ChevronUp,
  Flame,
  Sparkles,
  TrendingUp,
  Search,
  ImageIcon,
  Link2,
  Bookmark,
  Layers,
  Box as BoxIcon,
  Trophy,
  Star,
  DollarSign,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/format";

type CategoryKey = "tcg" | "lego" | "sports" | "grail" | "price-check" | "general";

const CATEGORIES: { key: CategoryKey; label: string; icon: typeof Layers; neon: string }[] = [
  { key: "tcg", label: "TCG", icon: Layers, neon: "#b66cff" },
  { key: "lego", label: "LEGO", icon: BoxIcon, neon: "var(--neon-green)" },
  { key: "sports", label: "Sports Cards", icon: Trophy, neon: "var(--neon-yellow)" },
  { key: "grail", label: "Grail Posts", icon: Star, neon: "#ff6cb6" },
  { key: "price-check", label: "Price Checks", icon: DollarSign, neon: "#2ee6d6" },
  { key: "general", label: "General", icon: Hash, neon: "var(--muted-foreground)" },
];

const CATEGORY_BY_KEY: Record<string, (typeof CATEGORIES)[number]> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

type SortKey = "hot" | "new" | "top";
type FeedKey = "all" | CategoryKey | "my-upvoted" | "my-posts" | "saved";

const SORT_TABS: { key: SortKey; label: string; icon: typeof Flame }[] = [
  { key: "hot", label: "Hot", icon: Flame },
  { key: "new", label: "New", icon: Sparkles },
  { key: "top", label: "Top", icon: TrendingUp },
];

export default function ForumPage() {
  const { data, isLoading } = useListPosts();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<FeedKey>("all");
  const [sort, setSort] = useState<SortKey>("hot");
  const [search, setSearch] = useState("");

  const posts = data ?? [];

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: posts.length };
    for (const c of CATEGORIES) map[c.key] = 0;
    for (const p of posts) {
      const k = (p.category ?? "general").toLowerCase();
      if (k in map) map[k] += 1;
    }
    return map;
  }, [posts]);

  const visible = useMemo(() => {
    let list = posts.slice();
    if (feed !== "all" && feed !== "my-upvoted" && feed !== "my-posts" && feed !== "saved") {
      list = list.filter((p) => (p.category ?? "general").toLowerCase() === feed);
    } else if (feed === "my-upvoted") {
      list = list.filter((p) => p.userReaction && p.userReaction !== "none");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (sort === "new") {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      // hot & top: by score (reactionCount) desc, tiebreak newest
      list.sort((a, b) => {
        if (b.reactionCount !== a.reactionCount) return b.reactionCount - a.reactionCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return list;
  }, [posts, feed, sort, search]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-[200px_1fr] gap-6 lg:gap-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block self-start sticky top-20 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Categories
            </div>
            <ul className="space-y-0.5">
              <SidebarItem
                active={feed === "all"}
                onClick={() => setFeed("all")}
                icon={Hash}
                label="All"
                count={counts.all}
                neon="var(--primary)"
              />
              {CATEGORIES.map((c) => (
                <SidebarItem
                  key={c.key}
                  active={feed === c.key}
                  onClick={() => setFeed(c.key)}
                  icon={c.icon}
                  label={c.label}
                  count={counts[c.key] ?? 0}
                  neon={c.neon}
                />
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              My Activity
            </div>
            <ul className="space-y-0.5">
              <SidebarItem
                active={feed === "my-upvoted"}
                onClick={() => setFeed("my-upvoted")}
                icon={ChevronUp}
                label="My Upvoted"
                neon="var(--primary)"
              />
              <SidebarItem
                active={feed === "my-posts"}
                onClick={() => setFeed("my-posts")}
                icon={MessageSquare}
                label="My Posts"
                neon="var(--primary)"
              />
              <SidebarItem
                active={feed === "saved"}
                onClick={() => setFeed("saved")}
                icon={Bookmark}
                label="Saved"
                neon="var(--primary)"
              />
            </ul>
          </div>
        </aside>

        {/* Main feed */}
        <div className="space-y-5 min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">Community</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Talk shop with fellow collectors.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-1" /> New post
                </Button>
              </DialogTrigger>
              <NewPostDialog onClose={() => setOpen(false)} />
            </Dialog>
          </div>

          {/* Compose bar */}
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex-1 text-left text-sm text-muted-foreground rounded-md border border-input bg-transparent px-3 py-2 hover:border-primary/40"
              >
                Share something with the community…
              </button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Add image">
                <ImageIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Add link">
                <Link2 className="size-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Sort tabs + search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {SORT_TABS.map((t) => {
                const Icon = t.icon;
                const active = sort === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSort(t.key)}
                    className={`px-3 py-1.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search posts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            <Card>
              <CardContent className="h-32" />
            </Card>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <MessageSquare className="size-8 mx-auto text-muted-foreground" />
                <div className="font-serif text-xl">No posts yet</div>
                <p className="text-sm text-muted-foreground">
                  Be the first to post.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  neon,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  label: string;
  count?: number;
  neon: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        <Icon className="size-4" style={{ color: active ? neon : undefined }} />
        <span className="flex-1 text-left">{label}</span>
        {count != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
        )}
      </button>
    </li>
  );
}

function PostRow({ post }: { post: ForumPost }) {
  const qc = useQueryClient();
  const react = useReactPost();
  const upvoted = post.userReaction === "heart";
  const score = post.reactionCount;
  const cat = CATEGORY_BY_KEY[(post.category ?? "general").toLowerCase() as CategoryKey] ??
    CATEGORY_BY_KEY.general;

  const toggleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    react.mutate(
      { id: post.id, data: { reaction: upvoted ? "none" : "heart" } },
      { onSuccess: () => qc.invalidateQueries() },
    );
  };

  return (
    <Card className="hover:border-primary/40 transition-colors overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 p-3 bg-muted/30 border-r border-border">
            <button
              type="button"
              onClick={toggleVote}
              aria-label="Upvote"
              className={`p-1 rounded transition-colors ${
                upvoted
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ChevronUp className="size-5" />
            </button>
            <span
              className={`text-xs font-semibold tabular-nums ${
                upvoted ? "text-primary" : "text-foreground"
              }`}
            >
              {score}
            </span>
          </div>

          {/* Body */}
          <Link
            href={`/forum/${post.id}`}
            className="flex-1 min-w-0 p-4 block"
          >
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide"
                style={{
                  borderColor: `color-mix(in srgb, ${cat.neon} 50%, transparent)`,
                  color: cat.neon,
                  backgroundColor: `color-mix(in srgb, ${cat.neon} 10%, transparent)`,
                }}
              >
                {cat.label}
              </Badge>
            </div>
            <div className="font-semibold text-sm truncate">{post.title}</div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {post.body}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Avatar className="size-5">
                <AvatarImage src={post.userAvatar ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {post.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{post.userName}</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" />
                {post.replyCount}
              </span>
              <span className="ml-auto">{formatRelativeDate(post.createdAt)}</span>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function NewPostDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const create = useCreatePost();
  const [form, setForm] = useState<{ title: string; body: string; category: CategoryKey }>(
    { title: "", body: "", category: "general" },
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.length === 0 || form.body.length < 20) {
      toast.error("Title required and body must be at least 20 characters");
      return;
    }
    create.mutate(
      {
        data: {
          title: form.title.slice(0, 200),
          body: form.body,
          category: form.category,
        },
      },
      {
        onSuccess: () => {
          toast.success("Posted to community");
          qc.invalidateQueries();
          onClose();
        },
        onError: () => toast.error("Could not post"),
      },
    );
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif">New post</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
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
              {CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Title
          </Label>
          <Input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="text-[10px] text-muted-foreground text-right">
            {form.title.length}/200
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Body
          </Label>
          <Textarea
            required
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div className="text-[10px] text-muted-foreground text-right">
            {form.body.length} chars · min 20
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Posting…" : "Post to community"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
