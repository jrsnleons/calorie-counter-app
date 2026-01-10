import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useEffect, useRef } from "react";

// Add safe global type definition for Google Auth
declare global {
    interface Window {
        google: any;
    }
}

export function Auth({ onLogin }: { onLogin: () => void }) {
    const btnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let timer: any;

        async function initGoogle() {
            try {
                const configRes = await fetch("/api/config");
                const config = await configRes.json();

                if (window.google && btnRef.current) {
                    window.google.accounts.id.initialize({
                        client_id: config.googleClientId,
                        callback: async (response: any) => {
                            const res = await fetch("/api/auth/google", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    token: response.credential,
                                }),
                            });
                            const data = await res.json();
                            if (data.success) onLogin();
                            else alert("Google Login Failed");
                        },
                    });
                    window.google.accounts.id.renderButton(btnRef.current, {
                        theme: "outline",
                        size: "large",
                        width: "100%",
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }

        // Check periodically for google script load if not ready
        timer = setInterval(() => {
            if (window.google) {
                clearInterval(timer);
                initGoogle();
            }
        }, 500);

        return () => clearInterval(timer);
    }, [onLogin]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-sm rounded-[2rem] shadow-xl border-none shadow-purple-200/50 dark:shadow-purple-900/20">
                <CardHeader className="text-center flex flex-col items-center">
                    <img
                        src="/logo.svg"
                        alt="Pakals Logo"
                        className="w-16 h-16 mb-4 shadow-lg rounded-2xl transform -rotate-3 hover:rotate-0 transition-all duration-300"
                    />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
                        Pakals
                    </h1>
                    <CardTitle className="text-xl font-semibold mt-2">
                        Welcome Back
                    </CardTitle>
                    <CardDescription>
                        Sign in to your account to track your meals
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8">
                    <div
                        ref={btnRef}
                        className="w-full flex justify-center"
                    ></div>
                </CardContent>
            </Card>
        </div>
    );
}
