import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner"; // Import toast

interface OnboardingData {
    age: string;
    gender: string;
    height: string;
    weight: string;
    activity: string;
    goal: string;
    tdee: number;
}

interface OnboardingProps {
    onComplete: (data: OnboardingData) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [shake, setShake] = useState(false); // Add shake state
    const [data, setData] = useState<Omit<OnboardingData, "tdee">>({
        age: "",
        gender: "male",
        height: "",
        weight: "",
        activity: "sedentary",
        goal: "maintain",
    });

    const calculateTDEE = () => {
        // Mifflin-St Jeor Equation
        const w = parseFloat(data.weight); // kg
        const h = parseFloat(data.height); // cm
        const a = parseFloat(data.age); // years

        let bmr = 10 * w + 6.25 * h - 5 * a;
        if (data.gender === "male") bmr += 5;
        else bmr -= 161;

        const multipliers: { [key: string]: number } = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
        };

        let tdee = bmr * (multipliers[data.activity] || 1.2);

        if (data.goal === "lose") tdee -= 500;
        else if (data.goal === "gain") tdee += 500;

        return Math.round(tdee);
    };

    const handleNext = () => {
        // Validation Logic
        if (step === 0) {
            if (!data.age || parseInt(data.age) <= 0)
                return showError("Please enter a valid age.");
            if (!data.height || parseInt(data.height) <= 0)
                return showError("Please enter a valid height.");
            if (!data.weight || parseInt(data.weight) <= 0)
                return showError("Please enter a valid weight.");
        }

        if (step === 3) {
            const finalTDEE = calculateTDEE();
            onComplete({ ...data, tdee: finalTDEE });
        } else {
            setStep((s) => s + 1);
        }
    };

    const showError = (msg: string) => {
        toast.error(msg);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const steps = [
        // Step 0: Basics
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">
                Let's get to know you
            </h2>
            <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex gap-4">
                    <Button
                        variant={data.gender === "male" ? "default" : "outline"}
                        onClick={() => setData({ ...data, gender: "male" })}
                        className="w-full"
                    >
                        Male
                    </Button>
                    <Button
                        variant={
                            data.gender === "female" ? "default" : "outline"
                        }
                        onClick={() => setData({ ...data, gender: "female" })}
                        className="w-full"
                    >
                        Female
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                        type="number"
                        value={data.age}
                        onChange={(e) =>
                            setData({ ...data, age: e.target.value })
                        }
                        placeholder="Years"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                        type="number"
                        value={data.height}
                        onChange={(e) =>
                            setData({ ...data, height: e.target.value })
                        }
                        placeholder="cm"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                        type="number"
                        value={data.weight}
                        onChange={(e) =>
                            setData({ ...data, weight: e.target.value })
                        }
                        placeholder="kg"
                    />
                </div>
            </div>
        </div>,

        // Step 1: Activity
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">
                How active are you?
            </h2>
            <RadioGroup
                value={data.activity}
                onValueChange={(v) => setData({ ...data, activity: v })}
            >
                <div className="space-y-2">
                    {[
                        {
                            val: "sedentary",
                            label: "Sedentary",
                            desc: "Office job, little exercise",
                        },
                        {
                            val: "light",
                            label: "Lightly Active",
                            desc: "1-3 days/week exercise",
                        },
                        {
                            val: "moderate",
                            label: "Moderately Active",
                            desc: "3-5 days/week exercise",
                        },
                        {
                            val: "active",
                            label: "Very Active",
                            desc: "6-7 days/week hard exercise",
                        },
                    ].map((opt) => (
                        <div
                            key={opt.val}
                            className={`flex items-center space-x-2 border p-4 rounded-xl cursor-pointer ${
                                data.activity === opt.val
                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                    : ""
                            }`}
                            onClick={() =>
                                setData({ ...data, activity: opt.val })
                            }
                        >
                            <RadioGroupItem value={opt.val} id={opt.val} />
                            <div className="flex-1">
                                <Label
                                    htmlFor={opt.val}
                                    className="font-semibold cursor-pointer"
                                >
                                    {opt.label}
                                </Label>
                                <p className="text-xs text-gray-500">
                                    {opt.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </RadioGroup>
        </div>,

        // Step 2: Goal
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">
                What is your goal?
            </h2>
            <div className="grid grid-cols-1 gap-3">
                {[
                    {
                        val: "lose",
                        label: "Lose Weight",
                        desc: "Deficit of ~500 kcal/day",
                    },
                    {
                        val: "maintain",
                        label: "Maintain Weight",
                        desc: "Eat what you burn",
                    },
                    {
                        val: "gain",
                        label: "Gain Muscle",
                        desc: "Surplus of ~500 kcal/day",
                    },
                ].map((opt) => (
                    <Button
                        key={opt.val}
                        variant={data.goal === opt.val ? "default" : "outline"}
                        className="h-auto py-4 justify-start text-left"
                        onClick={() => setData({ ...data, goal: opt.val })}
                    >
                        <div>
                            <div className="font-bold">{opt.label}</div>
                            <div className="text-xs opacity-70 font-normal">
                                {opt.desc}
                            </div>
                        </div>
                    </Button>
                ))}
            </div>
        </div>,

        // Step 3: Review
        <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold">Your Plan is Ready!</h2>
            <div className="py-8">
                <p className="text-gray-500">Daily Calorie Target</p>
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600 my-4">
                    {calculateTDEE()}
                </div>
                <p className="text-sm text-gray-400">kcal / day</p>
            </div>
            <p className="text-muted-foreground text-sm">
                Based on your {data.gender} info, {data.height}cm, {data.weight}
                kg.
            </p>
        </div>,
    ];

    return (
        <div
            className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4 ${
                shake ? "animate-shake" : ""
            }`}
        >
            <Card className="w-full max-w-md rounded-3xl shadow-xl border-none">
                <CardContent className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {steps[step]}
                        </motion.div>
                    </AnimatePresence>

                    <Button
                        className="w-full mt-6 rounded-xl h-12 text-lg"
                        onClick={handleNext}
                    >
                        {step === steps.length - 1
                            ? "Start Tracking"
                            : "Continue"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
