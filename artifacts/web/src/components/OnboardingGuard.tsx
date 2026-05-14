import { ReactNode } from "react";

// Profiles auto-provision (with a generated screenname + onboardingComplete=true)
// on first authenticated request, so there's no separate onboarding gate.
// Users can still edit their screenname / display name from Settings later.
export default function OnboardingGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
