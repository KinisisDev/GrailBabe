import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetMyProfile,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

// TODO: when Clerk publicMetadata is wired for onboarding,
// also check user.publicMetadata.onboardingComplete here.
export default function OnboardingGuard({ children }: { children: ReactNode }) {
  const { data: profile, isLoading, isError } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && profile && !profile.onboardingComplete) {
      setLocation("/onboarding");
    }
  }, [isLoading, profile, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError) return <>{children}</>;
  if (profile && !profile.onboardingComplete) return null;
  return <>{children}</>;
}
