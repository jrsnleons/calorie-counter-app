import { apiFetch } from "@/lib/api-client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

// Add safe global type definition for Google Auth
declare global {
    interface Window {
        google: any;
    }
}

export function Auth({ onLogin }: { onLogin: () => void }) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const configRes = await apiFetch("/api/config");
            const config = await configRes.json();

            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: config.googleClientId,
                    callback: async (response: any) => {
                        try {
                            const res = await apiFetch("/api/auth/google", {
                                method: "POST",
                                body: JSON.stringify({
                                    token: response.credential,
                                }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                onLogin();
                            } else {
                                alert("Google Login Failed");
                                setIsLoading(false);
                            }
                        } catch (error) {
                            alert("Login error. Please try again.");
                            setIsLoading(false);
                        }
                    },
                });
                window.google.accounts.id.prompt();
            } else {
                throw new Error("Google Sign-In not loaded yet");
            }
        } catch (e: any) {
            console.error(e);
            const currentOrigin = window.location.origin;
            alert(
                `Failed to initialize login.\n\nCurrent origin: ${currentOrigin}\n\nPlease add this origin to your Google Cloud Console:\n1. Go to console.cloud.google.com\n2. APIs & Services → Credentials\n3. Add "${currentOrigin}" to Authorized JavaScript origins`
            );
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
            <Link to="/" className="absolute top-6 left-6">
                <Button variant="ghost" size="sm">
                    ← Back
                </Button>
            </Link>

            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <img
                            src="/logo.svg"
                            alt="Pakals Logo"
                            className="w-16 h-16 rounded-2xl shadow-md"
                        />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">
                            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                Welcome to Pakals
                            </span>
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Sign in to start tracking your nutrition
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-8">
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full h-11 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 shadow-sm font-medium"
                        variant="outline"
                    >
                        {isLoading ? (
                            <span>Loading...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
