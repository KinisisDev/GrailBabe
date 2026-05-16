import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMsal } from "@azure/msal-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { ENTRA_LOGIN_SCOPES } from "@/lib/auth/msalConfig";

export default function SignUpPage() {
  const { instance, inProgress } = useMsal();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (inProgress === "none") {
      instance
        .loginRedirect({ scopes: ENTRA_LOGIN_SCOPES })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.error("[auth] loginRedirect failed", err);
          setError(msg);
        });
    }
  }, [isLoaded, isSignedIn, inProgress, instance, navigate]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 py-12">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm font-medium text-destructive">Sign up failed</p>
          <pre className="text-xs text-left whitespace-pre-wrap bg-muted p-3 rounded border border-border">
            {error}
          </pre>
          <p className="text-xs text-muted-foreground">
            Open the browser console for full details, then send a screenshot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-12">
      <div className="text-center space-y-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
      </div>
    </div>
  );
}
