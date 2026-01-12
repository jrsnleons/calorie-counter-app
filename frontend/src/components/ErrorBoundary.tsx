import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 p-4">
                    <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Oops! Something went wrong
                        </h2>
                        <p className="text-muted-foreground">
                            Don't worry, your data is safe. Try refreshing the
                            page.
                        </p>
                        {this.state.error && (
                            <details className="text-left text-xs text-muted-foreground bg-muted p-3 rounded">
                                <summary className="cursor-pointer font-mono">
                                    Technical Details
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
