import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
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
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { to: "/vault", label: "The Vault", icon: Box },
  { to: "/grail", label: "My Grail List", icon: Star },
  { to: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { to: "/insights", label: "AI Insights", icon: Sparkles, premium: true },
  { to: "/trades", label: "Trading", icon: ArrowLeftRight },
  { to: "/forum", label: "Community", icon: MessagesSquare },
  { to: "/messages", label: "Messages", icon: Mail },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const tier = me?.profile.tier ?? "free";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="h-14 px-1 flex items-center justify-center border-b border-border overflow-visible relative">
          <Link href="/dashboard" className="block mx-auto">
            <img src="/grailbabe-logo.png" alt="GrailBabe" className="block mx-auto h-auto w-auto max-h-36 max-w-full object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item, idx) => {
            const active = location === item.to || location.startsWith(item.to + "/");
            const Icon = item.icon;
            const neons = ["var(--neon-blue)", "var(--neon-green)", "var(--neon-red)", "var(--neon-yellow)"];
            const neon = neons[idx % neons.length];
            return (
              <Link
                key={item.to}
                href={item.to}
                style={{ ["--neon" as any]: neon }}
                className={`nav-neon flex items-center gap-3 px-3 py-2 rounded-md text-sm ${ active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground" }`}
              >
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
          <Link href="/billing" className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md">
              <CreditCard className="size-3.5" />
              Billing
            </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 border-b border-border flex items-center justify-between px-6 sticky top-0 z-10"
          style={{
            background:
              "linear-gradient(90deg, var(--neon-blue), var(--neon-green), var(--neon-yellow), var(--neon-red))",
          }}
        >
          <div className="text-sm font-semibold text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
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
