import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMyProfile,
  useCreateProfile,
  useCheckScreenname,
  getGetMyProfileQueryKey,
  getCheckScreennameQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "ZA", name: "South Africa" },
  { code: "OTHER", name: "Other" },
];

function regionLabelFor(country: string) {
  if (country === "US" || country === "AU") return "State";
  if (country === "CA") return "Province";
  if (country === "GB") return "County";
  return "Region";
}
function postalLabelFor(country: string) {
  if (country === "US") return "ZIP code";
  if (country === "GB" || country === "AU") return "Postcode";
  if (country === "CA") return "Postal code";
  return "Postal code";
}

const SCREENNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      retry: false,
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (me?.onboardingComplete) setLocation("/dashboard");
  }, [me, setLocation]);

  const [step, setStep] = useState<1 | 2>(1);
  const [screenname, setScreenname] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const debouncedName = useDebounced(screenname.trim(), 400);
  const formatValid =
    debouncedName.length > 0 && SCREENNAME_RE.test(debouncedName);

  const { data: avail, isFetching: checking } = useCheckScreenname(
    { screenname: debouncedName },
    {
      query: {
        queryKey: getCheckScreennameQueryKey({ screenname: debouncedName }),
        enabled: formatValid,
        retry: false,
        staleTime: 5_000,
      },
    },
  );

  const create = useCreateProfile();

  const screennameStatus = useMemo<
    { kind: "neutral" | "valid" | "invalid"; msg: string | null }
  >(() => {
    if (!screenname) return { kind: "neutral", msg: null };
    const t = screenname.trim();
    if (t.length < 3) return { kind: "invalid", msg: "At least 3 characters" };
    if (t.length > 20) return { kind: "invalid", msg: "At most 20 characters" };
    if (!SCREENNAME_RE.test(t))
      return { kind: "invalid", msg: "Letters, numbers, and underscores only" };
    if (debouncedName !== t || checking)
      return { kind: "neutral", msg: "Checking…" };
    if (avail?.available) return { kind: "valid", msg: "Available" };
    if (avail && !avail.available)
      return { kind: "invalid", msg: avail.reason ?? "Already taken" };
    return { kind: "neutral", msg: null };
  }, [screenname, debouncedName, avail, checking]);

  const canContinueStep1 = screennameStatus.kind === "valid";
  const canFinish = country && city.trim().length > 0 && !create.isPending;

  const onFinish = () => {
    create.mutate(
      {
        data: {
          screenname: screenname.trim(),
          city: city.trim(),
          region: region.trim() || null,
          postalCode: postalCode.trim() || null,
          country,
        },
      },
      {
        onSuccess: () => {
          toast.success("Welcome to GrailBabe!");
          // TODO: when Clerk is wired, refresh the Clerk session so
          // publicMetadata.onboardingComplete propagates client-side.
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response
              ?.data?.error ?? "Could not create your profile";
          toast.error(msg);
        },
      },
    );
  };

  if (isLoading || me?.onboardingComplete) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="/grailbabe-logo.png"
            alt="GrailBabe"
            className="mx-auto h-auto max-h-28 w-auto"
          />
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Step {step} of 2
              </div>
              <div className="flex gap-1.5">
                <span
                  className={`block h-1.5 w-6 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
                />
                <span
                  className={`block h-1.5 w-6 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}
                />
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-serif tracking-tight">
                    Choose your screenname
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    How other collectors know you. Changeable once every 90
                    days.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="screenname"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Screenname
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="screenname"
                      data-testid="input-screenname"
                      autoFocus
                      value={screenname}
                      onChange={(e) => setScreenname(e.target.value)}
                      placeholder="grailhunter"
                      className="pl-7"
                      maxLength={20}
                    />
                  </div>
                  {screennameStatus.msg && (
                    <div
                      className={`flex items-center gap-1.5 text-[13px] ${
                        screennameStatus.kind === "valid"
                          ? "text-[var(--neon-green)]"
                          : screennameStatus.kind === "invalid"
                            ? "text-[var(--neon-red)]"
                            : "text-muted-foreground"
                      }`}
                    >
                      {screennameStatus.kind === "valid" && (
                        <Check className="size-3.5" />
                      )}
                      {screennameStatus.kind === "invalid" && (
                        <X className="size-3.5" />
                      )}
                      {screennameStatus.kind === "neutral" && checking && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      <span>{screennameStatus.msg}</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  data-testid="button-continue"
                  disabled={!canContinueStep1}
                  onClick={() => setStep(2)}
                >
                  Continue →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-serif tracking-tight">
                    Where are you based?
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Helps find local trades. Your street address is never shown
                    publicly.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Country
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      City
                    </Label>
                    <Input
                      data-testid="input-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Brooklyn"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {regionLabelFor(country)}
                    </Label>
                    <Input
                      data-testid="input-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder={regionLabelFor(country)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    {postalLabelFor(country)}{" "}
                    <span className="normal-case text-muted-foreground/70 ml-1">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    data-testid="input-postal"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    disabled={create.isPending}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    data-testid="button-finish"
                    disabled={!canFinish}
                    onClick={onFinish}
                  >
                    {create.isPending && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    Finish setup
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
