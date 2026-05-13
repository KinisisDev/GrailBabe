import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCommunityPosts,
  useCreateCommunityPost,
  useVoteCommunityPost,
  useGetMe,
  getListCommunityPostsQueryKey,
  type CommunityPostSummary,
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
  ChevronUp,
  ChevronDown,
  Search,
  MessageSquare,
  Flame,
  Sparkles,
  TrendingUp,
  Pin,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string; dot: string }[] = [
  { value: "all", label: "All Posts", dot: "bg-foreground/40" },
  { value: "tcg", label: "TCG", dot: "bg-[#7c6ff0]" },
  { value: "lego", label: "LEGO", dot: "bg-[#69b341]" },
  { value: "sports", label: "Sports Cards", dot: "bg-[#e0a64c]" },
  { value: "grail", label: "Grail Posts", dot: "bg-[#d36b8c]" },
  { value: "price-check", label: "Price Checks", dot: "bg-[#3fb6a4]" },
  { value: "general", label: "General", dot: "bg-muted-foreground" },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== "all");

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  tcg: { bg: "#eeedfe", color: "#3c3489" },
  lego: { bg: "#eaf3de", color: "#27500a" },
  sports: { bg: "#faeeda", color: "#633806" },
  grail: { bg: "#fbeaf0", color: "#72243e" },
  "price-check": { bg: "#e1f5ee", color: "#085041" },
  general: { bg: "var(--muted)", color: "var(--muted-foreground)" },
};

function categoryLabel(value: string) {
  return (
    CATEGORIES.find((c) => c.value === value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Sort = "hot" | "new" | "top";

export default function Community() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("hot");
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const params = useMemo(() => {
    const out: { category?: string; sort?: Sort } = { sort };
    if (activeCategory !== "all") out.category = activeCategory;
    return out;
  }, [activeCategory, sort]);

  const { data: posts, isLoading, error, refetch } = useListCommunityPosts(
    params,
    {
      query: {
        queryKey: getListCommunityPostsQueryKey(params),
      },
    },
  );

  const { data: allPosts } = useListCommunityPosts(
    {},
    { query: { queryKey: getListCommunityPostsQueryKey({}) } },
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of CATEGORY_OPTIONS) map.set(c.value, 0);
    for (const p of allPosts ?? []) {
      const k = p.category;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [allPosts]);

  const totalCount = allPosts?.length ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts ?? [];
    return (posts ?? []).filter((p) => p.title.toLowerCase().includes(q));
  }, [posts, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
  };

  const voteMut = useVoteCommunityPost({
    mutation: {
      onSuccess: () => invalidate(),
      onError: (e) => toast.error((e as Error).message),
    },
  });

  const handleVote = (post: CommunityPostSummary, value: 1 | -1) => {
    voteMut.mutate({ id: post.id, data: { value } });
  };

  return (
    <div className="flex gap-6 p-6">
      {/* Left sidebar */}
      <aside className="w-[200px] shrink-0 space-y-6">
        <div>
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          <nav className="space-y-1">
            {CATEGORIES.map((c) => {
              const active = activeCategory === c.value;
              const count =
                c.value === "all" ? totalCount : counts.get(c.value) ?? 0;
              return (
                <button
                  key={c.value}
                  onClick={() => setActiveCategory(c.value)}
                  data-testid={`category-${c.value}`}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                    {c.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div>
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Activity
          </div>
          <nav className="space-y-1 text-sm text-muted-foreground">
            <button
              disabled
              className="block w-full rounded-md px-2 py-1.5 text-left opacity-60"
            >
              My Posts
            </button>
            <button
              disabled
              className="block w-full rounded-md px-2 py-1.5 text-left opacity-60"
            >
              My Upvoted
            </button>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
          <Button
            onClick={() => setComposeOpen(true)}
            data-testid="button-new-post"
          >
            <Plus className="mr-2 h-4 w-4" />
            New post
          </Button>
        </div>

        {/* Compose bar */}
        <Card
          onClick={() => setComposeOpen(true)}
          className="cursor-pointer transition-colors hover:border-primary/40"
          data-testid="compose-bar"
        >
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar className="h-9 w-9">
              {me?.profile?.avatarUrl ? (
                <AvatarImage src={me.profile.avatarUrl} />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-xs">
                {initials(me?.profile?.displayName ?? "You")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Share something with the community...
            </span>
          </CardContent>
        </Card>

        {/* Sort + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            {(
              [
                { v: "hot", icon: Flame, label: "Hot" },
                { v: "new", icon: Sparkles, label: "New" },
                { v: "top", icon: TrendingUp, label: "Top" },
              ] as const
            ).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setSort(v)}
                data-testid={`sort-${v}`}
                className={`flex items-center gap-1.5 rounded px-3 py-1 text-sm transition-colors ${
                  sort === v
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="pl-8"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="h-24 animate-pulse p-4" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center text-sm text-muted-foreground">
              <p>Could not load community posts.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No posts yet. Be the first to post in this category.
              </p>
              <Button onClick={() => setComposeOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onOpen={() => setLocation(`/community/${post.id}`)}
                onVote={handleVote}
                voting={voteMut.isPending}
              />
            ))}
          </div>
        )}
      </main>

      <NewPostDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultCategory={
          activeCategory !== "all" ? activeCategory : "general"
        }
        onCreated={() => {
          setComposeOpen(false);
          invalidate();
        }}
      />
    </div>
  );
}

function PostCard({
  post,
  onOpen,
  onVote,
  voting,
}: {
  post: CommunityPostSummary;
  onOpen: () => void;
  onVote: (p: CommunityPostSummary, v: 1 | -1) => void;
  voting: boolean;
}) {
  const badge = BADGE_STYLES[post.category] ?? BADGE_STYLES.general;
  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  return (
    <Card
      onClick={onOpen}
      data-testid={`post-card-${post.id}`}
      className={`cursor-pointer transition-colors hover:border-primary/50 ${
        post.isPinned ? "border-l-2 border-l-primary" : ""
      }`}
    >
      <CardContent className="flex gap-3 p-4">
        {/* Vote column */}
        <div
          className="flex w-9 shrink-0 flex-col items-center gap-0.5"
          onClick={stop}
        >
          <button
            disabled={voting}
            onClick={() => onVote(post, 1)}
            data-testid={`vote-up-${post.id}`}
            className={`rounded p-1 transition-colors ${
              post.userVote === 1
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span
            className={`text-sm font-medium tabular-nums ${
              post.userVote === 1
                ? "text-primary"
                : post.userVote === -1
                  ? "text-destructive"
                  : "text-foreground"
            }`}
          >
            {post.score}
          </span>
          <button
            disabled={voting}
            onClick={() => onVote(post, -1)}
            data-testid={`vote-down-${post.id}`}
            className={`rounded p-1 transition-colors ${
              post.userVote === -1
                ? "bg-destructive/15 text-destructive"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-transparent text-[11px]"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {categoryLabel(post.category)}
            </Badge>
            {post.isPinned && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
          </div>
          <h3 className="truncate font-medium leading-snug">{post.title}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {post.body}
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                {post.authorAvatar ? (
                  <AvatarImage src={post.authorAvatar} />
                ) : null}
                <AvatarFallback className="bg-primary/15 text-[9px]">
                  {initials(post.authorName)}
                </AvatarFallback>
              </Avatar>
              {post.authorName}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.commentCount}
            </span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewPostDialog({
  open,
  onOpenChange,
  defaultCategory,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCategory: string;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState(defaultCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createMut = useCreateCommunityPost({
    mutation: {
      onSuccess: () => {
        setTitle("");
        setBody("");
        toast.success("Posted to community");
        onCreated();
      },
      onError: (e) => toast.error((e as Error).message),
    },
  });

  const titleOk = title.trim().length > 0 && title.length <= 200;
  const bodyOk = body.trim().length >= 20;
  const canSubmit = titleOk && bodyOk && !createMut.isPending;

  // Sync default category when dialog opens with a different filter active
  if (open && category !== defaultCategory && title === "" && body === "") {
    setCategory(defaultCategory);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="np-title">Title</Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/200
              </span>
            </div>
            <Input
              id="np-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="What's on your mind?"
              data-testid="input-title"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="np-body">Body</Label>
              <span className="text-xs text-muted-foreground">
                Min 20 chars
              </span>
            </div>
            <Textarea
              id="np-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share details, photos, prices, or questions..."
              data-testid="input-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              createMut.mutate({ data: { category, title, body } })
            }
            data-testid="button-submit-post"
          >
            Post to community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
