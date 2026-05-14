import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";

const LAST_UPDATED = "MAY 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card">
      <CardContent className="p-6 md:p-8 space-y-5">
        <div className="space-y-1">
          <h2
            className="font-serif text-2xl md:text-3xl tracking-tight"
            style={{ color: "hsl(var(--accent))" }}
          >
            {title}
          </h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            LAST UPDATED: {LAST_UPDATED}
          </p>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-wide text-foreground">
      {children}
    </h3>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <Heading>{heading}</Heading>
      <div className="text-foreground/80">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-foreground/80 marker:text-muted-foreground">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}

function Contact() {
  return (
    <p className="text-foreground/80">
      Contact:{" "}
      <a
        href="mailto:support@grailbabe.com"
        className="font-medium underline-offset-4 hover:underline"
        style={{ color: "hsl(var(--accent))" }}
      >
        support@grailbabe.com
      </a>
    </p>
  );
}

export default function SecurityLegalPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <Link href="/security">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 mb-3 text-muted-foreground"
          >
            <ArrowLeft className="mr-1 size-4" />
            Security Center
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="grid size-10 place-items-center rounded-lg"
            style={{
              backgroundColor:
                "color-mix(in srgb, hsl(var(--accent)) 14%, transparent)",
              color: "hsl(var(--accent))",
            }}
          >
            <Scale className="size-5" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight">
              Legal Notices
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform terms, privacy, and authenticity disclaimers.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Terms of Service">
          <Block heading="Acceptance of Terms">
            <p>
              By accessing or using the Grailbabe platform, you agree to be
              bound by these Terms of Service. If you do not agree, you may
              not use the Platform. These Terms apply to all users, including
              visitors, registered users, and contributors.
            </p>
          </Block>

          <Block heading="Eligibility">
            <p>
              You must be at least 13 years of age to use Grailbabe. If you
              are under 18, you must have parental or guardian consent.
            </p>
          </Block>

          <Block heading="Account Registration">
            <p>
              To access certain features, you must create an account. You
              agree to: provide accurate and complete information during
              registration, maintain the security of your credentials, notify
              us immediately of any unauthorized use, and accept
              responsibility for all activity under your account.
            </p>
          </Block>

          <Block heading="Platform Use">
            <p>
              Grailbabe grants you a limited, non-exclusive license to access
              and use the Platform for personal, non-commercial purposes. You
              may not use the Platform for unlawful purposes, reproduce or
              exploit content without authorization, attempt to hack or
              interfere with Platform systems, use bots or scrapers, or
              impersonate another user.
            </p>
          </Block>

          <Block heading="User Content">
            <p>
              You retain ownership of content you submit. By posting, you
              grant Grailbabe a non-exclusive, worldwide, royalty-free license
              to use and display that content in connection with the Platform.
            </p>
          </Block>

          <Block heading="Trading and Transactions">
            <p>
              Grailbabe facilitates connections between collectors but is not
              a party to any trade or transaction. We make no warranties
              regarding item descriptions, valuations, or user conduct. Users
              engage in trades entirely at their own risk.
            </p>
          </Block>

          <Block heading="Subscription and Billing">
            <p>
              Paid tiers (Grail Seeker and Grail Master) are billed monthly or
              annually and auto-renew unless cancelled at least 24 hours
              before renewal. All fees are non-refundable except as required
              by law.
            </p>
          </Block>

          <Block heading="Termination">
            <p>
              We reserve the right to suspend or terminate your account for
              conduct that violates these Terms or is harmful to other users
              or the Platform.
            </p>
          </Block>

          <Block heading="Disclaimer of Warranties">
            <p>
              The Platform is provided "as is" and "as available" without
              warranties of any kind. We do not warrant that the Platform will
              be uninterrupted or error-free.
            </p>
          </Block>

          <Block heading="Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Grailbabe and its
              affiliates shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your
              use of the Platform.
            </p>
          </Block>

          <Block heading="Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware,
              United States. Disputes shall be resolved through binding
              arbitration under the rules of the American Arbitration
              Association.
            </p>
          </Block>

          <Contact />
        </Section>

        <Section title="Privacy Policy">
          <Block heading="Overview">
            <p>
              Grailbabe is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, store, and share your
              information. By using Grailbabe, you consent to the practices
              described here.
            </p>
          </Block>

          <Block heading="Information We Collect">
            <Bullets
              items={[
                "Account information: username, email address, and encrypted password",
                "Profile information: display name, avatar, bio, and collection preferences",
                "Collection data: items you scan, add, or track",
                "Usage data: pages visited, features used, session duration",
                "Device information: IP address, browser type, OS, device identifiers",
                "Communications: messages sent through the platform and support correspondence",
              ]}
            />
          </Block>

          <Block heading="How We Use Your Information">
            <p>
              We use your data to provide and improve the Platform,
              personalize your experience, process transactions, send service
              communications, detect fraud and abuse, comply with legal
              obligations, and conduct analytics.
            </p>
          </Block>

          <Block heading="Information Sharing">
            <p>
              We do not sell your personal information. We may share data with
              service providers (hosting, analytics, payments), other users to
              the extent your profile is public, law enforcement when required
              by law, and successor entities in a merger or acquisition.
            </p>
          </Block>

          <Block heading="Data Retention">
            <p>
              We retain data as long as your account is active. Upon account
              deletion, personal data is deleted or anonymized within 30 days,
              except where retention is legally required.
            </p>
          </Block>

          <Block heading="Your Rights">
            <p>
              You may have the right to access, correct, or delete your
              personal data, opt out of marketing, and request data
              portability. Contact{" "}
              <a
                href="mailto:support@grailbabe.com"
                className="font-medium underline-offset-4 hover:underline"
                style={{ color: "hsl(var(--accent))" }}
              >
                support@grailbabe.com
              </a>{" "}
              to exercise these rights.
            </p>
          </Block>

          <Block heading="Security">
            <p>
              We use industry-standard measures including TLS encryption and
              encrypted password storage. No method of transmission is 100%
              secure.
            </p>
          </Block>

          <Block heading="Children's Privacy">
            <p>
              The Platform is not directed to children under 13. We do not
              knowingly collect data from children under 13.
            </p>
          </Block>

          <Contact />
        </Section>

        <Section title="Authenticity Tools Disclaimer">
          <p>
            The authenticity tools provided within this application, including
            but not limited to image scanning, AI-based analysis, valuation
            insights, and educational guides, are offered solely for
            informational and assistive purposes.
          </p>
          <p>
            While we strive to provide accurate and helpful insights, we make
            no representations or warranties regarding the accuracy,
            completeness, reliability, or authenticity of any results,
            analyses, or recommendations generated by these tools.
          </p>
          <p>
            These tools do not constitute professional authentication,
            appraisal, or certification services. Users are solely responsible
            for independently verifying the authenticity, condition, and value
            of any item prior to engaging in any purchase, sale, or trade.
          </p>
          <p>
            By using these tools and the platform, you acknowledge and agree
            that all decisions are made at your own risk. The platform, its
            owners, affiliates, and partners shall not be held liable for any
            losses, damages, disputes, or claims arising from reliance on
            these tools or related outputs.
          </p>
          <p>
            Results should not be treated as equivalent to third-party grading
            or certification from PSA, BGS, or SGC. Seek qualified
            professional evaluation before making significant financial
            decisions based on collectible valuations.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Third-Party Trademarks:
            </span>{" "}
            This platform is not affiliated with, endorsed by, or sponsored by
            The Pokémon Company, Nintendo, Game Freak, Creatures Inc., MLB,
            NFL, NBA, NHL, Lego Group, or any other brand whose collectibles
            may appear on the platform. All trademarks belong to their
            respective owners.
          </p>

          <Contact />
        </Section>

        <Section title="Cookie Policy">
          <Block heading="What Are Cookies">
            <p>
              Cookies are small text files placed on your device. Grailbabe
              uses cookies and similar tracking technologies to operate and
              improve the Platform.
            </p>
          </Block>

          <Block heading="Types of Cookies We Use">
            <Bullets
              items={[
                "Strictly necessary: Required for the Platform to function (session auth, security tokens). Cannot be opted out of.",
                "Functional: Remember your preferences such as display settings and last-viewed collections.",
                "Analytics: Help us understand how users interact with the Platform to improve the product.",
                "Marketing: Deliver relevant promotional content within the Platform (only if opted in).",
              ]}
            />
          </Block>

          <Block heading="Third-Party Cookies">
            <p>
              Some cookies are placed by third parties including Clerk
              (authentication), analytics providers, and payment processors.
              These parties have their own cookie policies.
            </p>
          </Block>

          <Block heading="Managing Cookies">
            <p>
              You can control or delete cookies through your browser settings.
              Disabling certain cookies may affect Platform functionality
              including staying logged in.
            </p>
          </Block>

          <Block heading="Cookie Consent">
            <p>
              On first visit, you will see a cookie consent banner. You may
              accept all, reject non-essential, or customize preferences.
              Settings can be updated anytime in Platform preferences.
            </p>
          </Block>

          <Contact />
        </Section>
      </div>
    </div>
  );
}
