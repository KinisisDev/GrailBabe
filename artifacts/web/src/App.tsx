import { useState } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import OnboardingGuard from "@/components/OnboardingGuard";
import OnboardingPage from "@/pages/Onboarding";
import ProfilePage from "@/pages/Profile";
import DashboardPage from "@/pages/Dashboard";
import VaultHubPage from "@/pages/VaultHub";
import VaultTcgPage from "@/pages/VaultTcg";
import VaultTcgGamePage from "@/pages/VaultTcgGame";
import VaultLegoPage from "@/pages/VaultLego";
import VaultItemPage from "@/pages/VaultItem";
import MessagesPage from "@/pages/Messages";
import SecurityHubPage from "@/pages/SecurityHub";
import SecurityRulesPage from "@/pages/SecurityRules";
import SecurityLegalPage from "@/pages/SecurityLegal";
import GrailPage from "@/pages/Grail";
import TradesPage from "@/pages/Trades";
import MyTradesPage from "@/pages/MyTrades";
import ScannerPage from "@/pages/Scanner";
import ForumPage from "@/pages/Forum";
import ForumPostPage from "@/pages/ForumPost";
import CommunityPage from "@/pages/Community";
import CommunityPostPage from "@/pages/CommunityPost";
import PortfolioPage from "@/pages/Portfolio";
import BillingPage from "@/pages/Billing";
import SettingsPage from "@/pages/Settings";
import InsightsPage from "@/pages/Insights";
import NotFound from "@/pages/not-found";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoutes() {
  return (
    <OnboardingGuard>
      <AppShell>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/profile/:screenname" component={ProfilePage} />
          <Route path="/vault" component={VaultHubPage} />
          <Route path="/vault/tcg" component={VaultTcgPage} />
          <Route path="/vault/tcg/:game">{(params) => <VaultTcgGamePage game={params.game} />}</Route>
          <Route path="/vault/lego" component={VaultLegoPage} />
          <Route path="/vault/:id">{(params) => <VaultItemPage id={Number(params.id)} />}</Route>
          <Route path="/messages" component={MessagesPage} />
          <Route path="/security" component={SecurityHubPage} />
          <Route path="/security/rules" component={SecurityRulesPage} />
          <Route path="/security/legal" component={SecurityLegalPage} />
          <Route path="/grail" component={GrailPage} />
          <Route path="/trades" component={TradesPage} />
          <Route path="/my-trades" component={MyTradesPage} />
          <Route path="/scanner" component={ScannerPage} />
          <Route path="/forum" component={ForumPage} />
          <Route path="/forum/:id">{(params) => <ForumPostPage id={Number(params.id)} />}</Route>
          <Route path="/community" component={CommunityPage} />
          <Route path="/community/:postId">{(params) => <CommunityPostPage id={Number(params.postId)} />}</Route>
          <Route path="/portfolio" component={PortfolioPage} />
          <Route path="/insights" component={InsightsPage} />
          <Route path="/billing" component={BillingPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/"><Redirect to="/dashboard" /></Route>
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </OnboardingGuard>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  if (!splashDone) return <SplashScreen onEnter={() => setSplashDone(true)} />;
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Switch>
            <Route path="/onboarding" component={OnboardingPage} />
            <Route><ProtectedRoutes /></Route>
          </Switch>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
