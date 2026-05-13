import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, FileText, Shield, AlertCircle, Copyright } from "lucide-react";

export default function SecurityLegalPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/security">
          <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground">
            <ArrowLeft className="size-4 mr-1" />
            Security Center
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-lg grid place-items-center"
            style={{
              backgroundColor: "color-mix(in srgb, var(--neon-green) 14%, transparent)",
              color: "var(--neon-green)",
            }}
          >
            <Scale className="size-5" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Legal & Policies</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The legal foundation of your GrailBabe account.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <h2 className="font-serif text-xl">Terms of Service</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By using GrailBabe you agree to our terms covering account use, payments, content, and dispute resolution.
              Read the full terms for the complete agreement.
            </p>
            <Link href="/legal/terms">
              <Button variant="outline" size="sm">View Full Terms</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              <h2 className="font-serif text-xl">Privacy Policy</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect only what we need to run the service and never sell your personal data. Our full policy explains
              what we store, how we use it, and the controls you have over it.
            </p>
            <Link href="/legal/privacy">
              <Button variant="outline" size="sm">View Full Policy</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-muted-foreground" />
              <h2 className="font-serif text-xl">Collectibles Disclaimer</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GrailBabe does not guarantee card values, grades, or authenticity. All valuations shown in the app are
              estimates derived from third-party market data and should not be relied upon as appraisals or investment
              advice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Copyright className="size-5 text-muted-foreground" />
              <h2 className="font-serif text-xl">IP & Copyright</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GrailBabe is not affiliated with or endorsed by The Pokémon Company, Wizards of the Coast, Konami, Disney,
              Lucasfilm, the LEGO Group, or any other intellectual property holder. All trademarks, logos, and brand names
              are the property of their respective owners and are used here for identification purposes only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
