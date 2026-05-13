import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Box,
  Star,
  ArrowLeftRight,
  MessagesSquare,
  TrendingUp,
  Sparkles,
  CreditCard,
  Settings,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vault", label: "Vault", icon: Box },
  { to: "/grail", label: "Grail List", icon: Star },
  { to: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { to: "/insights", label: "AI Insights", icon: Sparkles, premium: true },
  { to: "/trades", label: "Trading", icon: ArrowLeftRight },
  { to: "/forum", label: "Forum", icon: MessagesSquare },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const tier = me?.profile.tier ?? "free";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-3 pt-0 pb-0 -mt-4">
          <Link href="/dashboard" className="block">
            <img src="/grailbabe-logo.png" alt="GrailBabe" className="block w-full h-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = location === item.to || location.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link key={item.to} href={item.to} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${ active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground" }`}>
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
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
            <Link href="/billing">
                <Button className="w-full" size="sm">
                  Upgrade to Premium
                </Button>
              </Link>
          ) : (
            <div className="px-3 py-2 rounded-md bg-primary/10 border border-primary/20 text-xs">
              <div className="font-medium text-primary">Premium Member</div>
              <div className="text-muted-foreground">Thank you for supporting</div>
            </div>
          )}
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md">
              <Settings className="size-3.5" />
              Settings
            </Link>
          <Link href="/billing" className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md">
              <CreditCard className="size-3.5" />
              Billing
            </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="text-sm text-muted-foreground">
            {NAV.find((n) => location.startsWith(n.to))?.label ?? "GrailBabe"}
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {me.profile.vaultCount} items · {me.profile.grailCount} grails
              </span>
            )}
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
