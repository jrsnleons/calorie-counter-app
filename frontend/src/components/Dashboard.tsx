import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Meal, User, WeightLog } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    Calendar,
    Camera,
    ChevronLeft,
    ChevronRight,
    Home,
    Loader2,
    LogOut,
    Scale,
    Settings as SettingsIcon,
    Trash2,
    Type,
    Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings } from "./Settings";

interface AnalysisResult {
    short_title: string;
    total_calories: number;
    summary: string;
    items?: { name: string; calories: number | string }[]; // Add items to interface
}

export function Dashboard({
    user,
    onLogout,
}: {
    user: User;
    onLogout: () => void;
}) {
    const [view, setView] = useState<"dashboard" | "settings">("dashboard");
    const [mode, setMode] = useState<"photo" | "text">("photo");
    const [textInput, setTextInput] = useState("");
    const [base64Image, setBase64Image] = useState("");
    const [preview, setPreview] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [history, setHistory] = useState<Meal[]>([]);
    const [currentDate, setCurrentDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    // New States for Tabs/Features
    const [activeTab, setActiveTab] = useState<"home" | "history" | "weight">(
        "home"
    );
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [newWeight, setNewWeight] = useState("");

    const [shake, setShake] = useState(false);
    const [mealType, setMealType] = useState<
        "Breakfast" | "Lunch" | "Dinner" | "Snack"
    >("Breakfast");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Phase 2: Calculations
    const tdee = user.tdee || 2000;

    function isSameDate(date1: string, date2: string) {
        return date1 === date2;
    }

    const todayCalories = history.reduce(
        (acc, curr) =>
            isSameDate(curr.date, currentDate)
                ? acc + (Number(curr.calories) || 0)
                : acc,
        0
    );
    const progress = Math.min((tdee > 0 ? todayCalories / tdee : 0) * 100, 100);
    const remaining = tdee - todayCalories;

    const groupedMeals = {
        Breakfast: history.filter(
            (m) =>
                m.meal_type === "Breakfast" && isSameDate(m.date, currentDate)
        ),
        Lunch: history.filter(
            (m) => m.meal_type === "Lunch" && isSameDate(m.date, currentDate)
        ),
        Dinner: history.filter(
            (m) =>
                m.meal_type === "Dinner" && isSameDate(m.date, currentDate)
        ),
        Snack: history.filter(
            (m) =>
                (m.meal_type === "Snack" || !m.meal_type) &&
                isSameDate(m.date, currentDate)
        ),
    };

    // Date Navigation Handlers
    const goToPreviousDay = () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 1);
        setCurrentDate(date.toISOString().split("T")[0]);
    };

    const goToNextDay = () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + 1);
        setCurrentDate(date.toISOString().split("T")[0]);
    };

    useEffect(() => {
        loadHistory();
        loadWeightLogs();
    }, []);

    const loadHistory = async () => {
        const res = await fetch("/api/history");
        const data = await res.json();
        setHistory(data);
    };

    const loadWeightLogs = async () => {
        try {
            const res = await fetch("/api/weight");
            if (res.ok) {
                const data = await res.json();
                setWeightLogs(data);
            }
        } catch (e) {
            console.error("Failed to load weight logs");
        }
    };

    const handleAddWeight = async () => {
        if (!newWeight) return;
        try {
            const today = new Date().toISOString().split("T")[0];
            const res = await fetch("/api/weight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weight: parseFloat(newWeight),
                    date: today,
                }),
            });
            if (res.ok) {
                setNewWeight("");
                loadWeightLogs();
                toast.success("Weight recorded!");
            }
        } catch (e) {
            toast.error("Failed to save weight");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const res = reader.result as string;
            setPreview(res);
            setBase64Image(res.split(",")[1]);
        };
        reader.readAsDataURL(file);
    };

    const showError = (msg: string) => {
        toast.error(msg, {
            style: {
                background: "#fee2e2",
                color: "#ef4444",
                border: "1px solid #fca5a5",
            },
        });
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleAnalyze = async () => {
        if (mode === "text" && !textInput.trim())
            return showError("Please enter some text description!");
        if (mode === "photo" && !base64Image)
            return showError("Please upload a photo first!");

        setAnalyzing(true);
        setResult(null);

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    food: textInput,
                    image: mode === "photo" ? base64Image : undefined,
                    meal_type: mealType, // Send meal type
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setResult(data);
            setTextInput("");
            setBase64Image("");
            setPreview("");
            loadHistory();
        } catch (e: any) {
            showError(e.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const deleteMeal = async (id: number) => {
        await fetch(`/api/history/${id}`, { method: "DELETE" });
        loadHistory();
    };

    const handleLogout = async () => {
        await fetch("/api/logout", { method: "POST" });
        onLogout();
    };

    return (
        <AnimatePresence mode="wait" initial={false}>
            {view === "settings" ? (
                <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <Settings user={user} onBack={() => setView("dashboard")} />
                </motion.div>
            ) : (
                <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`max-w-2xl mx-auto p-4 space-y-8 pb-20 ${
                        shake ? "animate-shake" : ""
                    }`}
                >
                    <div className="flex justify-between items-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-4 rounded-3xl shadow-lg border border-white/20 dark:border-white/10 sticky top-4 z-50 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.svg"
                                alt="Pakals Logo"
                                className="w-10 h-10 shadow-md rounded-xl"
                            />
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
                                Pakals
                            </h1>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-10 w-10 rounded-full"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback>
                                            {user.name?.charAt(0) || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                forceMount
                            >
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {user.name}
                                        </p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.username}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setView("settings")}
                                >
                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {activeTab === "home" && (
                        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Dashboard Hero: Progress Ring */}
                            <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                                <CardContent className="p-8 flex flex-col items-center justify-center relative z-10">
                                    <div className="relative w-48 h-48 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="96"
                                                cy="96"
                                                r="88"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                fill="transparent"
                                                className="text-white/20"
                                            />
                                            <circle
                                                cx="96"
                                                cy="96"
                                                r="88"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                fill="transparent"
                                                strokeDasharray={
                                                    2 * Math.PI * 88
                                                }
                                                strokeDashoffset={
                                                    2 *
                                                    Math.PI *
                                                    88 *
                                                    (1 - progress / 100)
                                                }
                                                strokeLinecap="round"
                                                className={`${
                                                    remaining < 0
                                                        ? "text-red-400"
                                                        : "text-white"
                                                } transition-all duration-1000 ease-out`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <span className="text-5xl font-bold tracking-tighter">
                                                {todayCalories}
                                            </span>
                                            <span className="text-sm font-medium opacity-80 uppercase tracking-widest mt-1">
                                                Eaten
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 mt-6 w-full text-center">
                                        <div>
                                            <div className="text-xs opacity-70 uppercase tracking-wider">
                                                Goal
                                            </div>
                                            <div className="text-xl font-bold">
                                                {tdee}
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className={`text-xs opacity-70 uppercase tracking-wider ${
                                                    remaining < 0
                                                        ? "text-red-200"
                                                        : ""
                                                }`}
                                            >
                                                {remaining < 0
                                                    ? "Over Limit"
                                                    : "Remaining"}
                                            </div>
                                            <div
                                                className={`text-xl font-bold ${
                                                    remaining < 0
                                                        ? "text-red-200"
                                                        : ""
                                                }`}
                                            >
                                                {remaining < 0
                                                    ? `+${Math.abs(remaining)}`
                                                    : remaining}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                {/* ...existing code... */}
                                <CardContent className="pt-6">
                                    <Tabs
                                        value={mode}
                                        onValueChange={(v) => setMode(v as any)}
                                    >
                                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-purple-50 dark:bg-purple-900/30 p-1 rounded-2xl">
                                            <TabsTrigger
                                                value="photo"
                                                className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-purple-950 data-[state=active]:shadow-sm"
                                            >
                                                <Camera className="w-4 h-4 mr-2" />{" "}
                                                Photo Mode
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="text"
                                                className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-purple-950 data-[state=active]:shadow-sm"
                                            >
                                                <Type className="w-4 h-4 mr-2" />{" "}
                                                Text Mode
                                            </TabsTrigger>
                                        </TabsList>

                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                            {[
                                                "Breakfast",
                                                "Lunch",
                                                "Dinner",
                                                "Snack",
                                            ].map((m) => (
                                                <Button
                                                    key={m}
                                                    variant={
                                                        mealType === m
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        setMealType(m as any)
                                                    }
                                                    className={`rounded-full px-4 ${
                                                        mealType === m
                                                            ? "bg-purple-600 hover:bg-purple-700 text-white border-transparent"
                                                            : "border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                                                    }`}
                                                >
                                                    {m}
                                                </Button>
                                            ))}
                                        </div>

                                        <TabsContent
                                            value="photo"
                                            className="space-y-4"
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <input
                                                type="file"
                                                ref={cameraInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFileChange}
                                            />

                                            {preview ? (
                                                <div className="relative rounded-2xl overflow-hidden border border-purple-100 dark:border-purple-800">
                                                    <img
                                                        src={preview}
                                                        alt="Preview"
                                                        className="w-full h-auto max-h-96 object-contain bg-black"
                                                    />
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 rounded-full shadow-lg"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreview("");
                                                            setBase64Image("");
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div
                                                        className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 h-40"
                                                        onClick={() =>
                                                            cameraInputRef.current?.click()
                                                        }
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300">
                                                            <Camera className="w-6 h-6" />
                                                        </div>
                                                        <span className="font-medium">
                                                            Take Photo
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 flex flex-col items-center justify-center gap-3 h-40"
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <span className="font-medium">
                                                            Upload
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="text">
                                            <Textarea
                                                placeholder="Describe your meal..."
                                                value={textInput}
                                                onChange={(e) =>
                                                    setTextInput(e.target.value)
                                                }
                                                className="h-32"
                                            />
                                        </TabsContent>
                                    </Tabs>

                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                    >
                                        {analyzing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                                Analyzing...
                                            </>
                                        ) : (
                                            "Track Meal"
                                        )}
                                    </Button>

                                    {analyzing && (
                                        <div className="mt-6 space-y-4 p-4 border rounded-lg bg-gray-50/50 dark:bg-zinc-900/50">
                                            <div className="space-y-2">
                                                <Skeleton className="h-5 w-1/3" />
                                                <Skeleton className="h-8 w-1/4" />
                                            </div>
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-5/6" />
                                            </div>
                                        </div>
                                    )}

                                    {!analyzing && result && (
                                        <div className="mt-6 bg-purple-50 dark:bg-purple-950/50 p-6 rounded-2xl border border-purple-100 dark:border-purple-800">
                                            <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100">
                                                {result.short_title}
                                            </h3>
                                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600 my-2">
                                                {result.total_calories} kcal
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                                {result.summary}
                                            </p>

                                            {/* Breakdown of items */}
                                            {result.items &&
                                                result.items.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                                                        <h4 className="font-semibold text-sm mb-2 opacity-70">
                                                            Breakdown
                                                        </h4>
                                                        <ul className="space-y-1 text-sm">
                                                            {result.items.map(
                                                                (
                                                                    item: any,
                                                                    i: number
                                                                ) => (
                                                                    <li
                                                                        key={i}
                                                                        className="flex justify-between"
                                                                    >
                                                                        <span>
                                                                            {
                                                                                item.name
                                                                            }
                                                                        </span>
                                                                        <span className="font-medium text-purple-600">
                                                                            {
                                                                                item.calories
                                                                            }
                                                                        </span>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xl font-semibold">
                                    📅 Daily Log
                                </h2>
                                <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full p-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={goToPreviousDay}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-medium px-2 min-w-[80px] text-center">
                                        {new Date(currentDate).toLocaleDateString(
                                            undefined,
                                            {
                                                month: "short",
                                                day: "numeric",
                                            }
                                        )}
                                        {currentDate ===
                                            new Date()
                                                .toISOString()
                                                .split("T")[0] && " (Today)"}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={goToNextDay}
                                        disabled={
                                            currentDate ===
                                            new Date().toISOString().split("T")[0]
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {/* Replaced history with grouped view above */}
                                {(
                                    Object.entries(groupedMeals) as [
                                        string,
                                        Meal[]
                                    ][]
                                ).map(([mType, meals]) => (
                                    <div key={mType} className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <h3 className="font-semibold text-gray-500 uppercase tracking-wide text-xs">
                                                {mType}
                                            </h3>
                                            <span className="text-xs font-bold">
                                                {meals.reduce(
                                                    (a, b) => a + b.calories,
                                                    0
                                                )}{" "}
                                                kcal
                                            </span>
                                        </div>
                                        {meals.length === 0 ? (
                                            <div className="p-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-xs text-gray-400">
                                                No {mType} logged
                                            </div>
                                        ) : (
                                            meals.map((meal) => (
                                                <Card
                                                    key={meal.id}
                                                    className="relative overflow-hidden group hover:shadow-md transition-all border-none bg-white dark:bg-zinc-900/50 shadow-sm"
                                                >
                                                    <div className="absolute bottom-2 right-2">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        Delete
                                                                        Meal
                                                                        Entry?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This
                                                                        will
                                                                        permanently
                                                                        delete "
                                                                        {
                                                                            meal.food_name
                                                                        }
                                                                        " from
                                                                        your
                                                                        history.
                                                                        This
                                                                        action
                                                                        cannot
                                                                        be
                                                                        undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        Cancel
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() =>
                                                                            deleteMeal(
                                                                                meal.id
                                                                            )
                                                                        }
                                                                        className="bg-red-500 hover:bg-red-600 text-white"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>

                                                    <CardContent className="p-4 flex justify-between items-start">
                                                        <div className="pr-8">
                                                            <h4 className="font-bold text-sm">
                                                                {meal.food_name}
                                                            </h4>
                                                            {/* Breakdown in Daily Log */}
                                                            {meal.items && (
                                                                <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                                    {(typeof meal.items ===
                                                                    "string"
                                                                        ? JSON.parse(
                                                                              meal.items
                                                                          )
                                                                        : meal.items
                                                                    ).map(
                                                                        (
                                                                            it: any,
                                                                            idx: number
                                                                        ) => (
                                                                            <li
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="flex gap-2"
                                                                            >
                                                                                <span>
                                                                                    •{" "}
                                                                                    {
                                                                                        it.name
                                                                                    }
                                                                                </span>
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            )}

                                                            <div className="text-xs text-gray-400 flex gap-2 mt-2">
                                                                <span className="bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded text-purple-700 dark:text-purple-300">
                                                                    {
                                                                        meal.protein
                                                                    }
                                                                    g P
                                                                </span>
                                                                <span className="bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                                                                    {meal.carbs}
                                                                    g C
                                                                </span>
                                                                <span className="bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                                                                    {meal.fat}g
                                                                    F
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="font-bold text-lg text-purple-600 dark:text-purple-400 leading-none">
                                                                {meal.calories}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                kcal
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "history" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold">History</h2>
                            {/* Full History Grouped by Date */}
                            {Object.entries(
                                history.reduce((acc, meal) => {
                                    (acc[meal.date] =
                                        acc[meal.date] || []).push(meal);
                                    return acc;
                                }, {} as Record<string, Meal[]>)
                            )
                                .sort((a, b) => b[0].localeCompare(a[0]))
                                .map(([date, meals]) => (
                                    <Card
                                        key={date}
                                        className="p-4 border-none shadow-sm bg-white dark:bg-zinc-900/50"
                                    >
                                        <h3 className="font-bold text-gray-500 mb-4">
                                            {new Date(date).toDateString()}
                                        </h3>
                                        <div className="space-y-3">
                                            {meals.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="flex justify-between text-sm items-center p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {m.food_name}
                                                        </div>
                                                        <div className="text-xs text-gray-400 capitalize">
                                                            {m.meal_type}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-purple-600">
                                                        {m.calories}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2 flex justify-between font-bold">
                                                <span>Total</span>
                                                <span>
                                                    {meals.reduce(
                                                        (a, b) =>
                                                            a +
                                                            Number(b.calories),
                                                        0
                                                    )}{" "}
                                                    kcal
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                        </div>
                    )}

                    {activeTab === "weight" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold">
                                Weight Tracker
                            </h2>
                            <Card className="p-6 border-none shadow-sm bg-white dark:bg-zinc-900/50">
                                <h3 className="font-medium mb-4">Log Weight</h3>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            placeholder="Weight"
                                            value={newWeight}
                                            onChange={(e) =>
                                                setNewWeight(e.target.value)
                                            }
                                            className="pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            kg
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleAddWeight}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        Log
                                    </Button>
                                </div>
                            </Card>

                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-500">
                                    History
                                </h3>
                                {weightLogs.length === 0 ? (
                                    <div className="text-center p-8 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                                        No weight logs yet
                                    </div>
                                ) : (
                                    weightLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex justify-between items-center p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-gray-800"
                                        >
                                            <span className="font-medium">
                                                {new Date(
                                                    log.date
                                                ).toLocaleDateString()}
                                            </span>
                                            <span className="font-bold text-purple-600">
                                                {log.weight} kg
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="h-24" />

                    <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-2 pb-6 md:pb-2 flex justify-around items-center z-50">
                        <button
                            onClick={() => setActiveTab("home")}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${
                                activeTab === "home"
                                    ? "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <Home className="w-6 h-6" />
                            <span className="text-[10px] font-medium">
                                Home
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${
                                activeTab === "history"
                                    ? "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <Calendar className="w-6 h-6" />
                            <span className="text-[10px] font-medium">
                                History
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("weight")}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${
                                activeTab === "weight"
                                    ? "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                                    : "text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <Scale className="w-6 h-6" />
                            <span className="text-[10px] font-medium">
                                Weight
                            </span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
