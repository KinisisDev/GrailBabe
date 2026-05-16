import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the failure in the browser console so we can see exactly which
    // component blew up — without this we get a totally blank page.
    console.error("[ErrorBoundary] Render error", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h1 className="font-serif text-2xl">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error while rendering. The details
              below help us fix it.
            </p>
            <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto whitespace-pre-wrap break-words max-h-72">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" onClick={this.reset}>
                Try again
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
