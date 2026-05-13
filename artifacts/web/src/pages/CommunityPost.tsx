import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCommunityPost,
  useListCommunityComments,
  useCreateCommunityComment,
  useVoteCommunityPost,
  getGetCommunityPostQueryKey,
  getListCommunityCommentsQueryKey,
  type CommunityPostSummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Pin,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  tcg: { bg: "#eeedfe", color: "#3c3489" },
  lego: { bg: "#eaf3de", color: "#27500a" },
  sports: { bg: "#faeeda", color: "#633806" },
  grail: { bg: "#fbeaf0", color: "#72243e" },
  "price-check": { bg: "#e1f5ee", color: "#085041" },
  general: { bg: "var(--muted)", color: "var(--muted-foreground)" },
};

const CATEGORY_LABEL: Record<string, string> = {
  tcg: "TCG",
  lego: "LEGO",
  sports: "Sports Cards",
  grail: "Grail Posts",
  "price-check": "Price Checks",
  general: "General",
};

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

export default function CommunityPost({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const {
    data: post,
    isLoading: postLoading,
    error: postError,
  } = useGetCommunityPost(id, {
    query: { queryKey: getGetCommunityPostQueryKey(id) },
  });

  const { data: comments, isLoading: commentsLoading } =
    useListCommunityComments(id, {
      query: { queryKey: getListCommunityCommentsQueryKey(id) },
    });

  const voteMut = useVoteCommunityPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetCommunityPostQueryKey(id),
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/community/posts"],
        });
      },
      onError: (e) => toast.error((e as Error).message),
    },
  });

  const createComment = useCreateCommunityComment({
    mutation: {
      onSuccess: () => {
        setReply("");
        queryClient.invalidateQueries({
          queryKey: getListCommunityCommentsQueryKey(id),
        });
        queryClient.invalidateQueries({
          queryKey: getGetCommunityPostQueryKey(id),
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/community/posts"],
        });
      },
      onError: (e) => toast.error((e as Error).message),
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link href="/community">
        <a className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </a>
      </Link>

      {postLoading ? (
        <Card>
          <CardContent className="h-48 animate-pulse p-6" />
        </Card>
      ) : postError || !post ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Post not found.
          </CardContent>
        </Card>
      ) : (
        <PostHeader
          post={post}
          onVote={(v) => voteMut.mutate({ id, data: { value: v } })}
          voting={voteMut.isPending}
        />
      )}

      {post && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {post.commentCount} {post.commentCount === 1 ? "Reply" : "Replies"}
            </h2>
          </div>

          <div className="space-y-2">
            {commentsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="h-16 animate-pulse p-4" />
                </Card>
              ))
            ) : (comments ?? []).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-6 w-6" />
                  No replies yet. Be the first.
                </CardContent>
              </Card>
            ) : (
              (comments ?? []).map((c) => (
                <Card key={c.id} data-testid={`comment-${c.id}`}>
                  <CardContent className="flex gap-3 p-4">
                    <Avatar className="h-8 w-8">
                      {c.authorAvatar ? (
                        <AvatarImage src={c.authorAvatar} />
                      ) : null}
                      <AvatarFallback className="bg-primary/15 text-[10px]">
                        {initials(c.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {c.authorName}
                        </span>
                        <span>·</span>
                        <span>{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                data-testid="input-reply"
              />
              <div className="flex justify-end">
                <Button
                  disabled={
                    reply.trim().length === 0 || createComment.isPending
                  }
                  onClick={() =>
                    createComment.mutate({ id, data: { body: reply.trim() } })
                  }
                  data-testid="button-reply"
                >
                  Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PostHeader({
  post,
  onVote,
  voting,
}: {
  post: CommunityPostSummary;
  onVote: (v: 1 | -1) => void;
  voting: boolean;
}) {
  const badge = BADGE_STYLES[post.category] ?? BADGE_STYLES.general;
  return (
    <Card
      className={post.isPinned ? "border-l-2 border-l-primary" : undefined}
    >
      <CardContent className="flex gap-4 p-5">
        <div className="flex w-9 shrink-0 flex-col items-center gap-0.5">
          <button
            disabled={voting}
            onClick={() => onVote(1)}
            data-testid="vote-up"
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
            onClick={() => onVote(-1)}
            data-testid="vote-down"
            className={`rounded p-1 transition-colors ${
              post.userVote === -1
                ? "bg-destructive/15 text-destructive"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-transparent text-[11px]"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {CATEGORY_LABEL[post.category] ?? post.category}
            </Badge>
            {post.isPinned && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold leading-snug">{post.title}</h1>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {post.body}
          </p>
          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
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
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
