import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="font-serif text-6xl tracking-tight text-primary">404</div>
        <h1 className="font-serif text-2xl">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
