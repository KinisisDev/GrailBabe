import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPost,
  useCreateReply,
  useReactPost,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, Flame, Eye, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/format";

const REACTIONS = [
  { value: "fire", label: "Fire", Icon: Flame },
  { value: "heart", label: "Heart", Icon: Heart },
  { value: "eyes", label: "Eyes", Icon: Eye },
  { value: "clap", label: "Clap", Icon: ThumbsUp },
] as const;

export default function ForumPostPage({ id }: { id: number }) {
  const { data, isLoading } = useGetPost(id);
  const qc = useQueryClient();
  const reply = useCreateReply();
  const react = useReactPost();
  const [body, setBody] = useState("");

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    reply.mutate(
      { id, data: { body } },
      {
        onSuccess: () => {
          setBody("");
          qc.invalidateQueries();
          toast.success("Replied");
        },
      },
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/forum" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to forum
        </Link>

      <div>
        <h1 className="font-serif text-3xl tracking-tight">
          {data.post.title}
        </h1>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Avatar className="size-5">
            <AvatarImage src={data.post.userAvatar ?? undefined} />
            <AvatarFallback>
              {data.post.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{data.post.userName}</span>
          <span>·</span>
          <span>{formatRelativeDate(data.post.createdAt)}</span>
          {data.post.category && (
            <Badge variant="outline" className="capitalize">
              {data.post.category}
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="whitespace-pre-wrap">{data.post.body}</p>
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
            {REACTIONS.map(({ value, label, Icon }) => {
              const active = data.post.userReaction === value;
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={active ? "default" : "ghost"}
                  onClick={() =>
                    react.mutate(
                      { id, data: { reaction: active ? "none" : value } },
                      { onSuccess: () => qc.invalidateQueries() },
                    )
                  }
                >
                  <Icon className="size-3.5 mr-1" />
                  {label}
                </Button>
              );
            })}
            <span className="text-xs text-muted-foreground ml-auto">
              {data.post.reactionCount} reactions
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-serif text-xl">
          {data.replies.length} {data.replies.length === 1 ? "reply" : "replies"}
        </h2>
        {data.replies.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 flex gap-3">
              <Avatar className="size-8">
                <AvatarImage src={r.userAvatar ?? undefined} />
                <AvatarFallback>
                  {r.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{r.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(r.createdAt)}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{r.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={submitReply} className="space-y-3">
        <Textarea
          rows={4}
          placeholder="Add to the conversation"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={reply.isPending || !body.trim()}>
            {reply.isPending ? "Replying…" : "Reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}
