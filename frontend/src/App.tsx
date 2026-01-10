import { Auth } from "@/components/Auth";
import { Dashboard } from "@/components/Dashboard";
import { ThemeProvider } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { User } from "@/types";
import { useEffect, useState } from "react";
import { Onboarding } from "./components/Onboarding";

function App() {
    const [user, setUser] = useState<User | null>(null);
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

    const checkUser = async () => {
        try {
            const res = await fetch("/api/me");
            if (res.ok) {
                const data = await res.json();
                if (data.loggedIn) setUser(data.user);
                else setUser(null);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
        setLoading(false);
    };

    const handleOnboardingComplete = async (data: any) => {
        try {
            const res = await fetch("/api/user/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save profile");
            checkUser(); // Refresh user data to get tdee
        } catch (e) {
            console.error(e);
            alert("Error saving profile. Please try again.");
        }
    };

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
                !user.tdee ? (
                    <Onboarding onComplete={handleOnboardingComplete} />
                ) : (
                    <Dashboard user={user} onLogout={() => setUser(null)} />
                )
            ) : (
                <Auth onLogin={() => window.location.reload()} />
            )}
            <Toaster position="top-center" />
        </ThemeProvider>
    );
}

export default App;
