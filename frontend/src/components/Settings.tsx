import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { User } from "@/types";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

interface SettingsProps {
    user: User;
    onBack: () => void;
    onUpdateUser: () => void;
}

export function Settings({ user, onBack, onUpdateUser }: SettingsProps) {
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: user.name || "",
        age: user.age || "",
        height: user.height || "",
        weight: user.weight || "",
        gender: user.gender || "Male",
        activity_level: user.activity_level || "Sedentary",
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    age: Number(formData.age),
                    height: Number(formData.height),
                    weight: Number(formData.weight),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(
                    `Profile updated! New Daily Goal: ${data.tdee} kcal`
                );
                onUpdateUser(); // Refresh parent state without reload
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
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
                <Button onClick={handleSave} disabled={loading} size="sm">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                </Button>
            </div>

            <Card className="rounded-3xl border-none shadow-lg shadow-purple-200/50 dark:shadow-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>
                        Used to calculate your daily calorie goal (TDEE).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Age</Label>
                            <Input
                                type="number"
                                value={formData.age}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        age: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <div className="flex items-center gap-2 pt-2">
                                <RadioGroup
                                    defaultValue={formData.gender}
                                    onValueChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            gender: val,
                                        })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value="Male"
                                            id="male"
                                        />
                                        <Label htmlFor="male">Male</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value="Female"
                                            id="female"
                                        />
                                        <Label htmlFor="female">Female</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Height (cm)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 175"
                                value={formData.height}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        height: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Weight (kg)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 70"
                                value={formData.weight}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        weight: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Activity Level</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.activity_level}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    activity_level: e.target.value,
                                })
                            }
                        >
                            <option value="Sedentary">
                                Sedentary (Office job, no exercise)
                            </option>
                            <option value="Light">
                                Light (Exercise 1-3 times/week)
                            </option>
                            <option value="Moderate">
                                Moderate (Exercise 3-5 times/week)
                            </option>
                            <option value="Active">
                                Active (Daily exercise)
                            </option>
                            <option value="Very Active">
                                Very Active (Physical job + training)
                            </option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-lg shadow-purple-200/50 dark:shadow-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
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
