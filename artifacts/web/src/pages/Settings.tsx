import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: me } = useGetMe();

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Badge
              className="uppercase tracking-wide"
              variant={me?.profile.tier === "premium" ? "default" : "secondary"}
            >
              {me?.profile.tier ?? "free"}
            </Badge>
            {me?.subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-2">
                Renews{" "}
                {new Date(me.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
