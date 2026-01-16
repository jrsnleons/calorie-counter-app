import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GoalWizardData, User } from "@/types";
import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Loader2,
    RefreshCw,
    Scale,
    TrendingDown,
    TrendingUp,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GoalWizardProps {
    user: User;
    onBack: () => void;
    onUpdateUser: () => void;
}

const GOALS = [
    {
        value: "Lose Weight",
        label: "Lose Fat",
        icon: TrendingDown,
        color: "from-green-400 to-emerald-500",
    },
    {
        value: "Maintain",
        label: "Maintain",
        icon: Scale,
        color: "from-blue-400 to-indigo-500",
    },
    {
        value: "Gain Muscle",
        label: "Gain Muscle",
        icon: TrendingUp,
        color: "from-orange-400 to-red-500",
    },
];

const PACES = [
    { val: 250, label: "Steady", desc: "0.25 kg/week" },
    { val: 500, label: "Normal", desc: "0.5 kg/week" },
    { val: 750, label: "Fast", desc: "0.75 kg/week" },
];

export function GoalWizard({ user, onBack, onUpdateUser }: GoalWizardProps) {
    const [wizardData, setWizardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);

    // Form State
    const [selectedGoal, setSelectedGoal] = useState(user.goal || "Maintain");
    const [selectedPace, setSelectedPace] = useState(500); // Deficit amount
    const [customCalories, setCustomCalories] = useState(user.tdee || 2000);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        loadWizardData();
    }, []);

    // Continuous Calculation Effect
    useEffect(() => {
        if (!wizardData) return;

        // Base: Maintenance Calories from server (Scientific calc)
        // Fallback to TDEE if maintenance is missing
        const base = Math.round(
            wizardData.maintenance || wizardData.currentTdee || 2000
        );

        let target = base;

        if (selectedGoal === "Lose Weight") {
            target = base - selectedPace;
        } else if (selectedGoal === "Gain Muscle") {
            target = base + selectedPace; // Surplus
        }
        // Maintain = base

        // Safety floors
        if (target < 1200) target = 1200;

        setCustomCalories(target);
    }, [selectedGoal, selectedPace, wizardData]);

    const loadWizardData = async () => {
        try {
            const res = await fetch("/api/goal-wizard", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setWizardData(data);
                // Pre-select based on current user goal
                const isGain = data.goal?.toLowerCase().includes("gain");
                const isLose = data.goal?.toLowerCase().includes("lose");
                if (isGain) setSelectedGoal("Gain Muscle");
                else if (isLose) setSelectedGoal("Lose Weight");
                else setSelectedGoal("Maintain");
            }
        } catch {
            console.error("Failed to load wizard data");
        } finally {
            setLoading(false);
        }
    };

    const applyChanges = async () => {
        setApplying(true);
        try {
            const res = await fetch("/api/goal-wizard/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tdee: Math.round(customCalories),
                    goal: selectedGoal,
                }),
            });
            if (res.ok) {
                toast.success("Goals updated successfully!");
                onUpdateUser();
                onBack();
            } else {
                toast.error("Failed to update goals");
            }
        } catch (e) {
            toast.error("Error updating goals");
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Adjust Goal</h1>
            </div>

            {/* Stepper */}
            <div className="flex justify-center gap-2 mb-8">
                {[1, 2].map((s) => (
                    <div
                        key={s}
                        className={`h-2 w-16 rounded-full transition-colors ${
                            s <= step ? "bg-primary" : "bg-muted"
                        }`}
                    />
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                    <h2 className="text-xl font-semibold text-center">
                        Select your strategy
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        {GOALS.map((goal) => {
                            const Icon = goal.icon;
                            const isSelected = selectedGoal === goal.value;
                            return (
                                <div
                                    key={goal.value}
                                    onClick={() => setSelectedGoal(goal.value)}
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-lg"
                                            : "border-transparent bg-card hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`p-3 rounded-full bg-gradient-to-br ${goal.color} text-white`}
                                        >
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">
                                                {goal.label}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {goal.value === "Maintain"
                                                    ? "Keep current weight"
                                                    : goal.value ===
                                                      "Lose Weight"
                                                    ? "Calorie deficit"
                                                    : "Calorie surplus"}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-5 right-5 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {selectedGoal !== "Maintain" && (
                        <div className="space-y-3 mt-6">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase text-center tracking-wider">
                                Pace
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {PACES.map((pace) => (
                                    <button
                                        key={pace.val}
                                        onClick={() =>
                                            setSelectedPace(pace.val)
                                        }
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            selectedPace === pace.val
                                                ? "border-primary bg-primary/10 font-bold text-primary"
                                                : "border-border bg-card hover:bg-muted"
                                        }`}
                                    >
                                        <div className="text-sm">
                                            {pace.label}
                                        </div>
                                        <div className="text-[10px] opacity-70">
                                            {pace.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        className="w-full h-12 text-lg rounded-xl mt-4"
                        onClick={() => setStep(2)}
                    >
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold">
                            Fine-tune Target
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            Based on{" "}
                            {wizardData?.maintenance
                                ? "scientific BMR"
                                : "your inputs"}
                        </p>
                    </div>

                    <Card className="border-none shadow-xl bg-gradient-to-br from-card to-muted/50">
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className="space-y-1 text-center">
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                                        Daily Target
                                    </p>
                                    <div className="flex items-center justify-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 rounded-full shrink-0"
                                            onClick={() =>
                                                setCustomCalories((c) =>
                                                    Math.max(1200, c - 50)
                                                )
                                            }
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </Button>
                                        <div className="relative flex justify-center items-center">
                                            <input
                                                type="number"
                                                value={customCalories} // Remove || "" to allow 0 if needed, but usually strictly controlled
                                                onChange={(e) =>
                                                    setCustomCalories(
                                                        Number(e.target.value)
                                                    )
                                                }
                                                className="w-48 text-center text-5xl font-black bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                            />
                                            <span className="absolute -right-8 bottom-3 text-sm text-muted-foreground font-medium">
                                                kcal
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 rounded-full shrink-0"
                                            onClick={() =>
                                                setCustomCalories((c) => c + 50)
                                            }
                                        >
                                            <ChevronUp className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    {customCalories < 1200 && (
                                        <p className="text-xs text-red-500 font-medium animate-pulse">
                                            ⚠️ Below recommended minimum (1200)
                                        </p>
                                    )}
                                </div>

                                <div className="w-full h-px bg-border/50" />

                                <div className="grid grid-cols-3 gap-6 w-full text-center">
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">
                                            BMR
                                        </p>
                                        {wizardData?.bmr ? (
                                            <p className="font-semibold">
                                                {wizardData.bmr}
                                            </p>
                                        ) : (
                                            <p
                                                className="text-xs text-orange-500 cursor-pointer hover:underline"
                                                onClick={() => onBack()}
                                            >
                                                Add Stats
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">
                                            Maintenance
                                        </p>
                                        {wizardData?.maintenance ? (
                                            <p className="font-semibold text-primary">
                                                {wizardData.maintenance}
                                            </p>
                                        ) : (
                                            <p
                                                className="text-xs text-orange-500 cursor-pointer hover:underline"
                                                onClick={() => onBack()}
                                            >
                                                Add Stats
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold">
                                            Variation
                                        </p>
                                        <p
                                            className={`font-semibold ${
                                                selectedGoal.includes("Lose")
                                                    ? "text-green-500"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {selectedGoal === "Lose Weight"
                                                ? `-${selectedPace}`
                                                : selectedGoal === "Gain Muscle"
                                                ? `+${selectedPace}`
                                                : "0"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-12 text-sm rounded-xl"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Strategy
                            </Button>
                            <Button
                                className="h-12 text-sm rounded-xl"
                                onClick={applyChanges}
                                disabled={applying}
                            >
                                {applying ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Confirm & Save"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
