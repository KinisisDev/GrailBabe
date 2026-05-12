import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import DashboardPage from "@/pages/Dashboard";
import VaultPage from "@/pages/Vault";
import VaultItemPage from "@/pages/VaultItem";
import GrailPage from "@/pages/Grail";
import TradesPage from "@/pages/Trades";
import ForumPage from "@/pages/Forum";
import ForumPostPage from "@/pages/ForumPost";
import PortfolioPage from "@/pages/Portfolio";
import BillingPage from "@/pages/Billing";
import SettingsPage from "@/pages/Settings";
import InsightsPage from "@/pages/Insights";
import NotFound from "@/pages/not-found";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/vault" component={VaultPage} />
        <Route path="/vault/:id">{(params) => <VaultItemPage id={Number(params.id)} />}</Route>
        <Route path="/grail" component={GrailPage} />
        <Route path="/trades" component={TradesPage} />
        <Route path="/forum" component={ForumPage} />
        <Route path="/forum/:id">{(params) => <ForumPostPage id={Number(params.id)} />}</Route>
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/billing" component={BillingPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/"><Redirect to="/dashboard" /></Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ProtectedRoutes />
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
