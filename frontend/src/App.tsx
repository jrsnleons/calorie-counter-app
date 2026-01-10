import { Auth } from "@/components/Auth";
import { Dashboard } from "@/components/Dashboard";
import { ThemeProvider } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";

function App() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/me")
            .then((res) => res.json())
            .then((data) => {
                if (data.loggedIn) setUser(data.user);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <ThemeProvider defaultTheme="system" storageKey="app-ui-theme">
            {loading ? (
                <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
                    {/* Header Skeleton */}
                    <div className="flex justify-between items-center bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 sticky top-4 z-10">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>

                    {/* Main Card Skeleton */}
                    <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full" />
                    </div>

                    {/* History Breakdown Skeleton */}
                    <Skeleton className="h-8 w-48" />
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                </div>
            ) : user ? (
                <Dashboard user={user} onLogout={() => setUser(null)} />
            ) : (
                <Auth onLogin={() => window.location.reload()} />
            )}
            <Toaster />
        </ThemeProvider>
    );
}

export default App;
