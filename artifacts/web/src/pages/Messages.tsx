import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Send, ArrowLeft, MessageSquare } from "lucide-react";
import {
  useListConversations,
  useListMessages,
  useSendMessage,
  useMarkConversationRead,
  useGetMe,
  getListConversationsQueryKey,
  getListMessagesQueryKey,
  getGetUnreadMessageCountQueryKey,
  type ConversationSummary,
  type DirectMessage,
} from "@workspace/api-client-react";

const NEONS = [
  "var(--neon-blue)",
  "var(--neon-green)",
  "var(--neon-yellow)",
  "var(--neon-red)",
];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return NEONS[Math.abs(h) % NEONS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(iso: string, mode: "list" | "thread") {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (mode === "list") {
    if (sameDay)
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (sameDay)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

function ConversationListSkeleton() {
  return (
    <ul className="py-1">
      {[0, 1, 2].map((i) => (
        <li key={i} className="px-4 py-3 flex gap-3 animate-pulse">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-muted rounded" />
            <div className="h-2 w-3/4 bg-muted/60 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MessagesPage() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const myId = me?.profile.id ?? "";

  const {
    data: conversations,
    isLoading: convosLoading,
    isError: convosError,
    refetch: refetchConvos,
  } = useListConversations();

  const initialFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const v = params.get("conversation");
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }, [search]);

  const [activeId, setActiveId] = useState<number | null>(initialFromUrl);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialFromUrl != null ? "thread" : "list",
  );

  // Auto-pick first conversation if none selected
  useEffect(() => {
    if (activeId == null && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  // Sync URL when conversation changes
  useEffect(() => {
    if (activeId == null) return;
    const params = new URLSearchParams(search);
    if (params.get("conversation") === String(activeId)) return;
    params.set("conversation", String(activeId));
    navigate(`${location.split("?")[0]}?${params.toString()}`, {
      replace: true,
    });
  }, [activeId, location, navigate, search]);

  const { data: messages, isLoading: msgsLoading } = useListMessages(
    activeId ?? 0,
    {
      query: {
        queryKey: getListMessagesQueryKey(activeId ?? 0),
        enabled: activeId != null,
        refetchInterval: 5000,
      },
    },
  );

  const sendMutation = useSendMessage();
  const markRead = useMarkConversationRead();

  const active: ConversationSummary | undefined = conversations?.find(
    (c) => c.id === activeId,
  );

  // Mark as read when conversation opens or new unread arrives
  const lastMarkedRef = useRef<{ id: number; lastMsgId: number | null } | null>(
    null,
  );
  useEffect(() => {
    if (activeId == null || !messages) return;
    const lastIncoming = [...messages]
      .reverse()
      .find((m) => m.senderId !== myId && !m.read);
    const fingerprint = lastIncoming?.id ?? null;
    const prev = lastMarkedRef.current;
    if (
      lastIncoming &&
      (!prev || prev.id !== activeId || prev.lastMsgId !== fingerprint)
    ) {
      lastMarkedRef.current = { id: activeId, lastMsgId: fingerprint };
      markRead.mutate(
        { id: activeId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            qc.invalidateQueries({
              queryKey: getGetUnreadMessageCountQueryKey(),
            });
          },
        },
      );
    }
  }, [activeId, messages, markRead, myId, qc]);

  // Auto-scroll to bottom when messages change
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages?.length, activeId]);

  const send = () => {
    const content = draft.trim();
    if (!content || activeId == null) return;
    sendMutation.mutate(
      { id: activeId, data: { content } },
      {
        onSuccess: () => {
          setDraft("");
          qc.invalidateQueries({
            queryKey: getListMessagesQueryKey(activeId),
          });
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
      },
    );
  };

  const openConversation = (id: number) => {
    setActiveId(id);
    setMobileView("thread");
  };

  const headerTitle = active?.otherUser.displayName ?? "Messages";

  return (
    <div className="h-[calc(100vh-3.5rem)] p-2 sm:p-6 lg:p-8">
      <Card className="h-full overflow-hidden">
        <div className="grid h-full md:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <aside
            className={`flex-col border-r border-border min-h-0 ${
              mobileView === "list" ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
              <h2 className="font-serif text-xl">Messages</h2>
              <Button variant="ghost" size="icon" aria-label="New message">
                <Pencil className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {convosLoading ? (
                <ConversationListSkeleton />
              ) : convosError ? (
                <div className="p-6 text-center space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Could not load messages
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchConvos()}
                  >
                    Retry
                  </Button>
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <EmptyConversations />
              ) : (
                <ul className="py-1">
                  {conversations.map((c) => {
                    const isActive = c.id === activeId;
                    const neon = colorFor(c.otherUser.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => openConversation(c.id)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-muted/60"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <Avatar className="size-10 shrink-0">
                            {c.otherUser.avatarUrl && (
                              <AvatarImage src={c.otherUser.avatarUrl} />
                            )}
                            <AvatarFallback
                              className="text-xs font-semibold"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${neon} 22%, transparent)`,
                                color: neon,
                              }}
                            >
                              {initials(c.otherUser.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="font-semibold text-sm truncate">
                                {c.otherUser.displayName}
                              </div>
                              <div className="text-[10px] text-muted-foreground shrink-0">
                                {formatTimestamp(
                                  c.lastMessage?.createdAt ?? c.updatedAt,
                                  "list",
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <div
                                className={`text-xs truncate ${
                                  c.unreadCount > 0
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {c.lastMessage?.content ?? "No messages yet"}
                              </div>
                              {c.unreadCount > 0 && (
                                <span
                                  className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold text-black"
                                  style={{
                                    backgroundColor: "var(--neon-blue)",
                                  }}
                                >
                                  {c.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </aside>

          {/* Thread view */}
          <section
            className={`flex-col min-h-0 ${
              mobileView === "thread" ? "flex" : "hidden md:flex"
            }`}
          >
            {active ? (
              <>
                <div className="h-14 px-4 flex items-center gap-3 border-b border-border shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileView("list")}
                    aria-label="Back to messages"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Avatar className="size-9">
                    {active.otherUser.avatarUrl && (
                      <AvatarImage src={active.otherUser.avatarUrl} />
                    )}
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${colorFor(active.otherUser.id)} 22%, transparent)`,
                        color: colorFor(active.otherUser.id),
                      }}
                    >
                      {initials(active.otherUser.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {headerTitle}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Direct message
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 px-4 py-6">
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {msgsLoading && !messages ? (
                      <div className="text-center text-xs text-muted-foreground py-10">
                        Loading messages…
                      </div>
                    ) : messages && messages.length > 0 ? (
                      messages.map((m: DirectMessage) => {
                        const mine = m.senderId === myId;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div className="flex flex-col max-w-[75%]">
                              <div
                                className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                                  mine
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-card border border-border text-foreground rounded-bl-sm"
                                }`}
                              >
                                {m.content}
                              </div>
                              <div
                                className={`text-[10px] text-muted-foreground mt-1 ${
                                  mine ? "text-right" : "text-left"
                                }`}
                              >
                                {formatTimestamp(m.createdAt, "thread")}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-10">
                        No messages yet — say hi.
                      </div>
                    )}
                    <div ref={scrollEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t border-border p-3 shrink-0">
                  <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <Input
                      placeholder={`Message ${active.otherUser.displayName}…`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      disabled={sendMutation.isPending}
                    />
                    <Button
                      onClick={send}
                      disabled={!draft.trim() || sendMutation.isPending}
                    >
                      <Send className="size-4" />
                      <span className="sr-only">Send</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyThread />
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
      <div
        className="size-12 rounded-full grid place-items-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--neon-blue) 18%, transparent)",
          color: "var(--neon-blue)",
        }}
      >
        <MessageSquare className="size-6" />
      </div>
      <div className="text-sm font-semibold">No messages yet</div>
      <div className="text-xs text-muted-foreground max-w-[240px]">
        Start a conversation from another user&apos;s profile or the trading
        board.
      </div>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="space-y-2">
        <MessageSquare className="size-8 mx-auto text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          Select a conversation to start chatting
        </div>
      </div>
    </div>
  );
}
