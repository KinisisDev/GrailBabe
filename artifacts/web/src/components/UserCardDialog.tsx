import {
  useGetProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function locationLine(p: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) {
  const parts = [p.city, p.region, p.country].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export function UserCardDialog({
  screenname,
  open,
  onOpenChange,
}: {
  screenname: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useGetProfile(screenname ?? "", {
    query: {
      queryKey: getGetProfileQueryKey(screenname ?? ""),
      enabled: open && !!screenname,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Collector</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Avatar className="h-20 w-20">
              {data.avatarUrl ? <AvatarImage src={data.avatarUrl} /> : null}
              <AvatarFallback className="bg-primary/15 text-lg">
                {initials(data.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <div className="text-base font-semibold leading-tight">
                {data.displayName}
              </div>
              <div className="text-xs text-muted-foreground">
                @{data.screenname}
              </div>
            </div>
            {locationLine(data) ? (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {locationLine(data)}
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
