import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { User } from "@/types";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

interface SettingsProps {
    user: User;
    onBack: () => void;
}

export function Settings({ user, onBack }: SettingsProps) {
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-md mx-auto p-4 space-y-6">
            <div className="flex items-center mb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="mr-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <Card className="rounded-3xl border-none shadow-lg shadow-purple-200/50 dark:shadow-none">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Manage your account settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <img
                            src={user.avatar}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-purple-100 dark:border-purple-800"
                        />
                        <div>
                            <p className="font-medium text-lg">{user.name}</p>
                            <p className="text-sm text-gray-500">
                                {user.username}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-lg shadow-purple-200/50 dark:shadow-none">
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Dark Mode</Label>
                            <p className="text-sm text-gray-500">
                                Toggle dark theme
                            </p>
                        </div>
                        <Switch
                            checked={theme === "dark"}
                            onCheckedChange={(checked) =>
                                setTheme(checked ? "dark" : "light")
                            }
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
