import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMsal } from "@azure/msal-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { ENTRA_LOGIN_SCOPES } from "@/lib/auth/msalConfig";

export default function SignUpPage() {
  const { instance, inProgress } = useMsal();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (inProgress === "none") {
      void instance.loginRedirect({
        scopes: ENTRA_LOGIN_SCOPES,
        prompt: "create",
      });
    }
  }, [isLoaded, isSignedIn, inProgress, instance, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-12">
      <div className="text-center space-y-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
      </div>
    </div>
  );
}
