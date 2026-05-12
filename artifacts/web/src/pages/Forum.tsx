import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPosts,
  useCreatePost,
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
import { Plus, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/format";

export default function ForumPage() {
  const { data, isLoading } = useListPosts();
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Forum</h1>
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

      {isLoading ? (
        <Card><CardContent className="h-32" /></Card>
      ) : data && data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="font-serif text-2xl">No posts yet</div>
            <p className="text-sm text-muted-foreground">
              Start the conversation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((p) => (
            <Link key={p.id} href={`/forum/${p.id}`}>
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-5 flex gap-4">
                    <Avatar>
                      <AvatarImage src={p.userAvatar ?? undefined} />
                      <AvatarFallback>
                        {p.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{p.title}</span>
                        {p.category && (
                          <Badge variant="outline" className="capitalize">
                            {p.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {p.body}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{p.userName}</span>
                        <span>·</span>
                        <span>{formatRelativeDate(p.createdAt)}</span>
                        <span className="ml-auto flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {p.replyCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="size-3" />
                          {p.reactionCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPostDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const create = useCreatePost();
  const [form, setForm] = useState({ title: "", body: "", category: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        data: {
          title: form.title,
          body: form.body,
          category: form.category || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Posted");
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
        <Field label="Title">
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Input
            placeholder="general, sneakers, watches…"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </Field>
        <Field label="Body">
          <Textarea
            required
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
