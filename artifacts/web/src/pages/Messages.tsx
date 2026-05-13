import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Send, ArrowLeft } from "lucide-react";

type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  color: string;
};

type Message = {
  id: string;
  from: "them" | "me";
  text: string;
  time: string;
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "sarah",
    name: "Sarah K.",
    preview: "Is the Charizard still available?",
    time: "2 min ago",
    unread: 2,
    color: "var(--neon-blue)",
  },
  {
    id: "mike",
    name: "Mike T.",
    preview: "Deal! I'll ship Monday.",
    time: "1 hr ago",
    unread: 0,
    color: "var(--neon-green)",
  },
  {
    id: "jordan",
    name: "Jordan L.",
    preview: "What condition is the LEGO set?",
    time: "Yesterday",
    unread: 1,
    color: "var(--neon-yellow)",
  },
  {
    id: "alex",
    name: "Alex R.",
    preview: "Thanks for the trade!",
    time: "2 days ago",
    unread: 0,
    color: "var(--neon-red)",
  },
];

const THREADS: Record<string, Message[]> = {
  sarah: [
    { id: "1", from: "them", text: "Hey! Is the Charizard holo still available?", time: "10:14am" },
    { id: "2", from: "me", text: "Yes it is! Just listed it yesterday.", time: "10:16am" },
    { id: "3", from: "them", text: "What grade is it?", time: "10:17am" },
    { id: "4", from: "me", text: "PSA 9, near mint.", time: "10:19am" },
    { id: "5", from: "them", text: "Is the Charizard still available?", time: "10:22am" },
  ],
  mike: [
    { id: "1", from: "me", text: "Cool, sending payment now.", time: "9:02am" },
    { id: "2", from: "them", text: "Deal! I'll ship Monday.", time: "9:05am" },
  ],
  jordan: [
    { id: "1", from: "them", text: "What condition is the LEGO set?", time: "Yesterday" },
  ],
  alex: [
    { id: "1", from: "me", text: "Trade went smooth on my end too.", time: "2 days ago" },
    { id: "2", from: "them", text: "Thanks for the trade!", time: "2 days ago" },
  ],
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function MessagesPage() {
  const [activeId, setActiveId] = useState<string>(CONVERSATIONS[0].id);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const active = CONVERSATIONS.find((c) => c.id === activeId)!;
  const messages = THREADS[activeId] ?? [];

  const openConversation = (id: string) => {
    setActiveId(id);
    setMobileView("thread");
  };

  const send = () => {
    if (!draft.trim()) return;
    setDraft("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">
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
              <ul className="py-1">
                {CONVERSATIONS.map((c) => {
                  const isActive = c.id === activeId;
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
                          <AvatarFallback
                            className="text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${c.color} 22%, transparent)`,
                              color: c.color,
                            }}
                          >
                            {initials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-semibold text-sm truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground shrink-0">
                              {c.time}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <div
                              className={`text-xs truncate ${
                                c.unread > 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {c.preview}
                            </div>
                            {c.unread > 0 && (
                              <span
                                className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold text-black"
                                style={{ backgroundColor: "var(--neon-blue)" }}
                              >
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </aside>

          {/* Thread view */}
          <section
            className={`flex-col min-h-0 ${
              mobileView === "thread" ? "flex" : "hidden md:flex"
            }`}
          >
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
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${active.color} 22%, transparent)`,
                    color: active.color,
                  }}
                >
                  {initials(active.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{active.name}</div>
                <div className="text-[11px] text-muted-foreground">Active conversation</div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-3 max-w-3xl mx-auto">
                {messages.map((m) => {
                  const mine = m.from === "me";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex flex-col max-w-[75%]">
                        <div
                          className={`px-4 py-2 rounded-2xl text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          {m.text}
                        </div>
                        <div
                          className={`text-[10px] text-muted-foreground mt-1 ${
                            mine ? "text-right" : "text-left"
                          }`}
                        >
                          {m.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-3 shrink-0">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Input
                  placeholder={`Message ${active.name}…`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button onClick={send} disabled={!draft.trim()}>
                  <Send className="size-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
