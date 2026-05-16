import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrademarkFooter } from "@/components/TrademarkFooter";
import {
  useGetMe,
  useGetUnreadMessageCount,
  getGetUnreadMessageCountQueryKey,
  useListMyTrades,
  getListMyTradesQueryKey,
} from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Box,
  Shield,
  Star,
  ArrowLeftRight,
  MessagesSquare,
  Mail,
  TrendingUp,
  Sparkles,
  CreditCard,
  Settings as SettingsIcon,
  UserCircle,
  ScanLine,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: UserCircle },
  { to: "/vault", label: "The Vault", icon: Box },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/grail", label: "My Grail List", icon: Star },
  { to: "/portfolio", label: "My Analytics", icon: TrendingUp },
  { to: "/insights", label: "AI Insights", icon: Sparkles, premium: true },
  { to: "/trades", label: "Trading board", icon: ArrowLeftRight },
  { to: "/community", label: "Community", icon: MessagesSquare },
  { to: "/messages", label: "Messages", icon: Mail },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const SIDEBAR_KEY = "gb_sidebar_collapsed";

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user, signOut, signIn, isSignedIn } = useAuth();
  const { data: me } = useGetMe();
  const tier = me?.profile.tier ?? "free";
  const { data: unread } = useGetUnreadMessageCount({
    query: {
      queryKey: getGetUnreadMessageCountQueryKey(),
      refetchInterval: 15000,
    },
  });
  const unreadCount = unread?.count ?? 0;
  const { data: myTradesAll } = useListMyTrades(
    { status: "all" },
    {
      query: {
        queryKey: getListMyTradesQueryKey({ status: "all" }),
        refetchInterval: 30000,
      },
    },
  );
  const pendingTradeCount = (myTradesAll ?? []).filter(
    (t) => t.status === "pending" && !t.myConfirmed,
  ).length;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  });
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Mobile drawer state — controlled separately from desktop collapsed state
  const [mobileOpen, setMobileOpen] = useState(false);
  // Auto-close mobile drawer when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const SidebarContent = ({
    onNavClick,
    onCollapse,
  }: {
    onNavClick?: () => void;
    onCollapse?: () => void;
  }) => (
    <div className="flex flex-col h-full">
      <div className="h-14 px-1 flex items-center justify-center border-b border-border overflow-visible relative">
        <Link href="/dashboard" className="block mx-auto" onClick={onNavClick}>
          <img
            src="/grailbabe-logo.png"
            alt="GrailBabe"
            className="pointer-events-none block mx-auto h-auto w-auto max-h-36 max-w-full object-contain"
          />
        </Link>
      </div>
      {onCollapse && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={onCollapse}
            data-testid="button-collapse-sidebar"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors border border-border/60"
          >
            <PanelLeftClose className="size-3.5" />
            Hide sidebar
          </button>
        </div>
      )}
      <nav className="flex-1 px-3 pt-3 pb-3 space-y-1 overflow-y-auto">
        {NAV.map((item, idx) => {
          const active =
            location === item.to || location.startsWith(item.to + "/");
          const Icon = item.icon;
          const neons = [
            "var(--neon-blue)",
            "var(--neon-green)",
            "var(--neon-red)",
            "var(--neon-yellow)",
          ];
          const neon = neons[idx % neons.length];
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onNavClick}
              style={{ ["--neon" as any]: neon }}
              className={`nav-neon flex items-center gap-3 px-3 py-2 rounded-md text-sm ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/messages" && unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold text-black"
                  style={{ backgroundColor: "var(--neon-blue)" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {item.to === "/my-trades" && pendingTradeCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold text-black"
                  style={{ backgroundColor: "var(--neon-yellow)" }}
                >
                  {pendingTradeCount > 99 ? "99+" : pendingTradeCount}
                </span>
              )}
              {item.premium && tier === "free" && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 border-accent/40 text-accent uppercase tracking-wide"
                >
                  Pro
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        {tier === "free" ? (
          <Link href="/billing" onClick={onNavClick}>
            <Button className="w-full" size="sm">
              Upgrade to Premium
            </Button>
          </Link>
        ) : (
          <div className="px-3 py-2 rounded-md bg-primary/10 border border-primary/20 text-xs">
            <div className="font-medium text-primary">Premium Member</div>
            <div className="text-muted-foreground">
              Thank you for supporting
            </div>
          </div>
        )}
        <Link
          href="/billing"
          onClick={onNavClick}
          className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md"
        >
          <CreditCard className="size-3.5" />
          Billing
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      {!isMobile && !collapsed && (
        <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
          <SidebarContent onCollapse={() => setCollapsed(true)} />
        </aside>
      )}
      {/* Mobile drawer */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-72 max-w-[85vw] bg-sidebar border-border"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-10 gap-2"
          style={{
            background:
              "linear-gradient(90deg, var(--neon-blue), var(--neon-green), var(--neon-yellow), var(--neon-red))",
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                data-testid="button-open-mobile-nav"
                aria-label="Open navigation"
                className="inline-flex items-center justify-center size-9 rounded-md bg-black/20 text-black hover:bg-black/30 transition-colors shrink-0"
              >
                <Menu className="size-5" />
              </button>
            ) : (
              collapsed && (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  data-testid="button-expand-sidebar"
                  aria-label="Show sidebar"
                  title="Show sidebar"
                  className="inline-flex items-center justify-center size-8 rounded-md bg-black/20 text-black hover:bg-black/30 transition-colors shrink-0"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              )
            )}
            <div className="text-sm font-semibold text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.4)] truncate">
              {NAV.find((n) => location.startsWith(n.to))?.label ?? "GrailBabe"}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {me && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {me.profile.vaultCount} items · {me.profile.grailCount} grails
              </span>
            )}
            {isSignedIn && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    data-testid="button-account-menu"
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-black/30"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-black/30 text-black text-xs font-semibold">
                        {(user.displayName ?? "C")
                          .split(/\s+/)
                          .map((s) => s[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate">
                        {user.displayName}
                      </span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <UserIcon className="size-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => void signOut()}
                  >
                    <LogOut className="size-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void signIn()}
                data-testid="button-signin-shell"
              >
                Sign in
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="flex-1">{children}</div>
          <TrademarkFooter />
        </main>
      </div>
    </div>
  );
}
