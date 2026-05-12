import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: me } = useGetMe();
  const qc = useQueryClient();
  const upd = useUpdateMe();
  const [form, setForm] = useState({ displayName: "", bio: "" });

  useEffect(() => {
    if (me) {
      setForm({
        displayName: me.profile.displayName,
        bio: me.profile.bio ?? "",
      });
    }
  }, [me]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    upd.mutate(
      { data: { displayName: form.displayName, bio: form.bio } },
      {
        onSuccess: () => {
          toast.success("Saved");
          qc.invalidateQueries();
        },
      },
    );
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Display name
              </Label>
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Bio
              </Label>
              <Textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={upd.isPending}>
                {upd.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
