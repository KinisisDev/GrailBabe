import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  SignIn,
  SignUp,
  useAuth,
  ClerkLoaded,
  ClerkLoading,
} from "@clerk/react";
import { useEffect, ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import AppShell from "@/components/AppShell";
import LandingPage from "@/pages/Landing";
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

function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(null);
    void getToken;
  }, [getToken]);
  return null;
}

function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  return isLoaded && !isSignedIn ? <>{children}</> : null;
}

function CenteredAuth({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      {mode === "sign-in" ? (
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      ) : (
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      )}
    </div>
  );
}

function ProtectedRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/vault" component={VaultPage} />
        <Route path="/vault/:id">
          {(params) => <VaultItemPage id={Number(params.id)} />}
        </Route>
        <Route path="/grail" component={GrailPage} />
        <Route path="/trades" component={TradesPage} />
        <Route path="/forum" component={ForumPage} />
        <Route path="/forum/:id">
          {(params) => <ForumPostPage id={Number(params.id)} />}
        </Route>
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/billing" component={BillingPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/sign-in/:rest*">
        <CenteredAuth mode="sign-in" />
      </Route>
      <Route path="/sign-up/:rest*">
        <CenteredAuth mode="sign-up" />
      </Route>
      <Route>
        <SignedIn>
          <ProtectedRoutes />
        </SignedIn>
        <SignedOut>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route>
              <Redirect to="/sign-in" />
            </Route>
          </Switch>
        </SignedOut>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <AuthBridge />
          <ClerkLoading>
            <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
              Loading…
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <AppRouter />
          </ClerkLoaded>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
