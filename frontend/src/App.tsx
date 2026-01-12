import { Dashboard } from "@/components/Dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingPage } from "@/components/LandingPage";
import { NotFound } from "@/components/NotFound";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/api-interceptor";
import type { User } from "@/types";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
    Navigate,
    Route,
    BrowserRouter as Router,
    Routes,
} from "react-router-dom";
import { Auth } from "./components/Auth";
import { Onboarding } from "./components/Onboarding";

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider defaultTheme="system" storageKey="app-ui-theme">
                <Router>
                    <AppContent />
                </Router>
                <Toaster position="top-center" />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

function AppContent() {
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <img
                    src="/logo.svg"
                    alt="Loading"
                    className="w-16 h-16 animate-pulse shadow-lg rounded-2xl"
                />
            </div>
        );
    }

    return (
        <Routes>
            {/* Landing Page (Public) */}
            <Route
                path="/"
                element={
                    user ? (
                        <Navigate to="/home" replace />
                    ) : (
                        <LandingPage />
                    )
                }
            />

            {/* Login/Auth Page (Public) */}
            <Route
                path="/login"
                element={
                    user ? (
                        <Navigate to="/home" replace />
                    ) : (
                        <Auth onLogin={() => window.location.reload()} />
                    )
                }
            />

            {/* Main App (Protected) */}
            <Route
                path="/home"
                element={
                    !user ? (
                        <Navigate to="/" replace />
                    ) : !user.tdee ? (
                        <Onboarding onComplete={handleOnboardingComplete} />
                    ) : (
                        <Dashboard
                            user={user}
                            onLogout={() => {
                                setUser(null);
                                window.location.href = "/";
                            }}
                            onUpdateUser={checkUser}
                        />
                    )
                }
            />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
