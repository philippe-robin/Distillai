import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-medium text-red-400">Rendering Error</p>
            <p className="mt-1 text-xs text-text-secondary">
              {this.state.error?.message ?? "An unexpected error occurred"}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
