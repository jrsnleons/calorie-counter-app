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
    Pencil,
    Plus,
    Scale,
    Settings as SettingsIcon,
    Trash2,
    Type,
    Upload,
    X,
    AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings } from "./Settings";
import { apiQueue } from "@/lib/api-queue";

interface AnalysisResult {
    short_title: string;
    total_calories: number;
    summary: string;
    items?: { name: string; calories: number | string }[]; // Add items to interface
}

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onUpdateUser: () => void;
}

export function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
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
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [historySearch, setHistorySearch] = useState("");

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

    const getSafeItems = (items: any) => {
        try {
            const parsed = typeof items === "string" ? JSON.parse(items) : items;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

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
            (m) => m.meal_type === "Dinner" && isSameDate(m.date, currentDate)
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
            await apiQueue.add(async () => {
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
            });
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
        if (analyzing) return; // Prevent double-click

        if (mode === "text" && !textInput.trim())
            return showError("Please enter some text description!");
        if (mode === "photo" && !base64Image)
            return showError("Please upload a photo first!");

        setAnalyzing(true);
        setResult(null);
        toast.loading("Analyzing your meal...", { id: "analyze" });

        try {
            await apiQueue.add(async () => {
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
                toast.success("Meal tracked successfully!", { id: "analyze" });
            });
        } catch (e: any) {
            showError(e.message);
            toast.dismiss("analyze");
        } finally {
            setAnalyzing(false);
        }
    };

    const deleteMeal = async (id: number) => {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
            return;
        }

        await apiQueue.add(async () => {
            await fetch(`/api/history/${id}`, { method: "DELETE" });
            loadHistory();
            toast.success("Meal deleted");
        });
        setDeleteConfirm(null);
    };

    const handleLogout = async () => {
        await fetch("/api/logout", { method: "POST" });
        onLogout();
    };

    const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    const [editItems, setEditItems] = useState<{ name: string; calories: number }[]>([]);

    useEffect(() => {
        if (editingMeal?.id) {
            try {
                const parsed = editingMeal.items ? JSON.parse(editingMeal.items) : [];
                setEditItems(parsed);
            } catch {
                setEditItems([]);
            }
        } else {
            setEditItems([]);
        }
    }, [editingMeal?.id]);

    const updateEditItems = (newItems: { name: string; calories: number }[]) => {
        setEditItems(newItems);
        const newTotal = newItems.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

        if (editingMeal) {
            setEditingMeal({
                ...editingMeal,
                calories: newTotal, // Update total calories
                items: JSON.stringify(newItems) // Update items string
            });
        }
    };

    const handleUpdateMeal = async (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!editingMeal) return;

        try {
            await apiQueue.add(async () => {
                const res = await fetch(`/api/history/${editingMeal.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editingMeal),
                });
                if (res.ok) {
                    toast.success("Meal updated successfully");
                    setEditingMeal(null);
                    loadHistory();
                } else {
                    toast.error("Failed to update meal");
                }
            });
        } catch (e) {
            toast.error("Error updating meal");
        }
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
                    className="h-full"
                >
                    <Settings
                        user={user}
                        onBack={() => setView("dashboard")}
                        onUpdateUser={onUpdateUser}
                    />
                </motion.div>
            ) : (
                <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`h-screen flex flex-col md:flex-col max-w-7xl mx-auto ${
                        shake ? "animate-shake" : ""
                    }`}
                >
                    {/* Desktop Topbar / Mobile Navbar Logic */}
                    <div className="order-last md:order-first md:w-full md:border-b md:border-gray-100 md:dark:border-gray-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl md:bg-white/50 md:backdrop-blur-md p-2 md:px-8 md:py-3 flex md:flex-row justify-around md:justify-start items-center fixed md:relative bottom-0 left-0 right-0 z-50 md:z-50 gap-4">
                        {/* Logo for Desktop */}
                        <div className="hidden md:flex items-center gap-3 mr-8">
                            <img
                                src="/logo.svg"
                                alt="Pakals Logo"
                                className="w-8 h-8 rounded-lg shadow-sm"
                            />
                            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
                                Pakals
                            </span>
                        </div>

                        {/* Navigation Items */}
                        <div className="contents md:flex md:items-center md:gap-2">
                            <button
                                onClick={() => setActiveTab("home")}
                                className={`flex flex-col md:flex-row items-center md:gap-2 p-2 md:px-4 md:py-2 rounded-xl transition-all ${
                                    activeTab === "home"
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                <Home className="w-6 h-6 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-sm font-medium md:flex">
                                    Home
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`flex flex-col md:flex-row items-center md:gap-2 p-2 md:px-4 md:py-2 rounded-xl transition-all ${
                                    activeTab === "history"
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                <Calendar className="w-6 h-6 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-sm font-medium md:flex">
                                    History
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab("weight")}
                                className={`flex flex-col md:flex-row items-center md:gap-2 p-2 md:px-4 md:py-2 rounded-xl transition-all ${
                                    activeTab === "weight"
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                <Scale className="w-6 h-6 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-sm font-medium md:flex">
                                    Weight
                                </span>
                            </button>
                        </div>

                        {/* Desktop User Menu at Right */}
                        <div className="hidden md:flex ml-auto border-l border-gray-100 dark:border-gray-800 pl-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-zinc-600 flex items-center gap-2 h-auto py-1.5 px-2 hover:bg-gray-50"
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name}
                                            />
                                            <AvatarFallback>
                                                {user.name?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col items-start truncate">
                                            <span className="text-sm font-medium">
                                                {user.name}
                                            </span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-56"
                                    align="end"
                                    forceMount
                                >
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
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto h-full p-4 md:p-8 space-y-8 pb-28 md:pb-8 flex flex-col md:max-w-3xl md:mx-auto w-full">
                        {/* Mobile Header (Hidden on Desktop) */}
                        <div className="flex md:hidden justify-between items-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-4 rounded-3xl shadow-lg border border-white/20 dark:border-white/10 sticky top-4 z-50 transition-all duration-300">
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
                            {/* Dashboard Hero: Standard Progress Card */}
                            <Card className={`rounded-[2.5rem] border-none overflow-hidden relative shadow-2xl transition-all duration-1000 ${
                                remaining < 0
                                    ? "bg-gradient-to-br from-red-600 via-orange-600 to-red-500 animate-pulse-fast ring-4 ring-red-400/50"
                                    : "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 animate-gradient-xy ring-1 ring-white/10"
                                } text-white p-6 group`}>

                                {/* Ambient Background Effect */}
                                <div className="absolute top-[-20%] right-[-10%] w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float-slow pointer-events-none" />
                                <div className="absolute bottom-[-10%] left-[-10%] w-56 h-56 rounded-full bg-fuchsia-400/20 blur-3xl animate-float-medium pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

                                <div className={`absolute top-4 right-4 p-4 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-12 ${remaining < 0 ? "text-yellow-300 opacity-20" : ""}`}>
                                    {remaining < 0 ? <AlertTriangle className="w-32 h-32 animate-bounce" /> : <Scale className="w-32 h-32" />}
                                </div>

                                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
                                    <div className="space-y-1">
                                         <div className="text-sm font-bold uppercase tracking-widest text-white/80">
                                            {remaining < 0 ? "Daily Limit Exceeded" : "Calories Eaten"}
                                        </div>
                                        <div className="text-7xl font-black tracking-tighter drop-shadow-md">
                                            {todayCalories}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full space-y-2">
                                        <div className={`h-6 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border ${remaining < 0 ? "border-red-300/50 shadow-[0_0_15px_rgba(255,0,0,0.5)]" : "border-white/10"}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 ${
                                                    remaining < 0
                                                        ? "bg-gradient-to-r from-red-500 to-yellow-500 animate-barberpole w-full"
                                                        : "bg-white"
                                                }`}
                                                style={{ width: remaining < 0 ? '100%' : `${Math.min(progress, 100)}%` }}
                                            >
                                                {remaining < 0 && <span className="text-[10px] font-bold text-red-900 uppercase tracking-widest animate-pulse">Overload</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 w-full mt-4">
                                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                            <div className="text-[10px] uppercase tracking-wider font-bold mb-1 text-white/80">
                                                Goal
                                            </div>
                                            <div className="text-2xl font-bold">
                                                {tdee}
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-2xl backdrop-blur-sm border transition-colors duration-500 ${
                                            remaining < 0
                                                ? "bg-red-950/30 border-red-200/50 animate-pulse"
                                                : "bg-white/10 border-white/10"
                                        }`}>
                                            <div className="text-[10px] uppercase tracking-wider font-bold mb-1 text-white/80">
                                                {remaining < 0 ? "Over Limit" : "Remaining"}
                                            </div>
                                            <div className="text-2xl font-bold">
                                                {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
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

                                            <p className="text-muted-foreground leading-relaxed text-sm">
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
                                        {new Date(
                                            currentDate
                                        ).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                        })}
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
                                            new Date()
                                                .toISOString()
                                                .split("T")[0]
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
                                            <h3 className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
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
                                            <div className="p-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
                                                <div className="text-3xl mb-2">
                                                    {mType === "Breakfast" ? "🌅" :
                                                     mType === "Lunch" ? "☀️" :
                                                     mType === "Dinner" ? "🌙" : "🍿"}
                                                </div>
                                                <p className="text-xs text-muted-foreground">No {mType.toLowerCase()} logged yet</p>
                                            </div>
                                        ) : (
                                            meals.map((meal) => (
                                                <Card
                                                    key={meal.id}
                                                    className="relative overflow-hidden group hover:shadow-md transition-all border-none bg-card shadow-sm"
                                                >
                                                    <div className="absolute bottom-2 right-2 flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                                            onClick={() =>
                                                                setEditingMeal(
                                                                    meal
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deleteMeal(meal.id)}
                                                            className={`h-8 w-8 transition-colors ${
                                                                deleteConfirm === meal.id
                                                                    ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                                                                    : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                                            }`}
                                                            title={deleteConfirm === meal.id ? "Click again to confirm" : "Delete meal"}
                                                        >
                                                            {deleteConfirm === meal.id ? (
                                                                <AlertTriangle className="w-4 h-4" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>

                                                    <CardContent className="p-4 flex justify-between items-start">
                                                        <div className="pr-8">
                                                            <h4 className="font-bold text-sm">
                                                                {meal.food_name}
                                                            </h4>
                                                            {/* Breakdown in Daily Log */}
                                                            {meal.items && (
                                                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                                    {getSafeItems(
                                                                        meal.items
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
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-2xl font-bold">History</h2>
                                <div className="flex-1 max-w-sm">
                                    <Input
                                        placeholder="Search meals..."
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            {/* Empty State for History */}
                            {history.length === 0 ? (
                                <div className="text-center py-16 space-y-4">
                                    <div className="text-6xl">📊</div>
                                    <h3 className="text-xl font-semibold">No meals logged yet</h3>
                                    <p className="text-muted-foreground">
                                        Start tracking your meals to see your history here!
                                    </p>
                                </div>
                            ) : (
                            <div className="space-y-6">
                            {/* Full History Grouped by Date */}
                            {Object.entries(
                                history
                                    .filter(meal =>
                                        historySearch === "" ||
                                        meal.food_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                                        meal.meal_type?.toLowerCase().includes(historySearch.toLowerCase())
                                    )
                                    .reduce((acc, meal) => {
                                        (acc[meal.date] =
                                            acc[meal.date] || []).push(meal);
                                        return acc;
                                    }, {} as Record<string, Meal[]>)
                            )
                                .sort((a, b) => b[0].localeCompare(a[0]))
                                .map(([date, meals]) => (
                                    <Card
                                        key={date}
                                        className="p-4 border-none shadow-sm bg-card"
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
                        </div>
                    )}

                    {activeTab === "weight" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold">
                                Weight Tracker
                            </h2>
                            <Card className="p-6 border-none shadow-sm bg-card">
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
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                            kg
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleAddWeight}
                                        className="bg-primary hover:opacity-90"
                                    >
                                        Log
                                    </Button>
                                </div>
                            </Card>

                            <div className="space-y-3">
                                <h3 className="font-medium text-muted-foreground">
                                    History
                                </h3>
                                {weightLogs.length === 0 ? (
                                    <div className="text-center py-12 space-y-3">
                                        <div className="text-5xl">⚖️</div>
                                        <p className="text-muted-foreground">
                                            Start tracking your weight to see progress over time!
                                        </p>
                                    </div>
                                ) : (
                                    weightLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex justify-between items-center p-4 bg-card rounded-xl border"
                                        >
                                            <span className="font-medium">
                                                {new Date(
                                                    log.date
                                                ).toLocaleDateString()}
                                            </span>
                                            <span className="font-bold text-primary">
                                                {log.weight} kg
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}


                    </div>
                </motion.div>
            )}

            {/* Edit Meal Modal */}
            {editingMeal && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            setEditingMeal(null);
                        }
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-xl border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">Edit Meal</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setEditingMeal(null);
                                }}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Food Name
                                </label>
                                <Input
                                    value={editingMeal.food_name}
                                    onChange={(e) =>
                                        setEditingMeal({
                                            ...editingMeal,
                                            food_name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Calories
                                    </label>
                                    <Input
                                        type="number"
                                        value={editingMeal.calories}
                                        onChange={(e) =>
                                            setEditingMeal({
                                                ...editingMeal,
                                                calories: Number(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Meal Type
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={editingMeal.meal_type || "Snack"}
                                        onChange={(e) =>
                                            setEditingMeal({
                                                ...editingMeal,
                                                meal_type: e.target
                                                    .value as any,
                                            })
                                        }
                                    >
                                        {[
                                            "Breakfast",
                                            "Lunch",
                                            "Dinner",
                                            "Snack",
                                        ].map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Prot (g)
                                    </label>
                                    <Input
                                        value={String(
                                            editingMeal.protein || ""
                                        ).replace("g", "")}
                                        onChange={(e) =>
                                            setEditingMeal({
                                                ...editingMeal,
                                                protein: e.target.value + "g",
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Carbs (g)
                                    </label>
                                    <Input
                                        value={String(
                                            editingMeal.carbs || ""
                                        ).replace("g", "")}
                                        onChange={(e) =>
                                            setEditingMeal({
                                                ...editingMeal,
                                                carbs: e.target.value + "g",
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Fat (g)
                                    </label>
                                    <Input
                                        value={String(
                                            editingMeal.fat || ""
                                        ).replace("g", "")}
                                        onChange={(e) =>
                                            setEditingMeal({
                                                ...editingMeal,
                                                fat: e.target.value + "g",
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Item Breakdown */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Item Breakdown
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        className="h-5 px-2 text-xs"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            updateEditItems([
                                                ...editItems,
                                                { name: "New Item", calories: 0 },
                                            ]);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {editItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex gap-2 items-center"
                                        >
                                            <Input
                                                className="h-8 text-sm flex-1"
                                                value={item.name}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[idx].name =
                                                        e.target.value;
                                                    updateEditItems(newItems);
                                                }}
                                            />
                                            <Input
                                                className="h-8 text-sm w-20"
                                                type="number"
                                                value={item.calories}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[idx].calories = Number(
                                                        e.target.value
                                                    );
                                                    updateEditItems(newItems);
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newItems =
                                                        editItems.filter(
                                                            (_, i) => i !== idx
                                                        );
                                                    updateEditItems(newItems);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {editItems.length === 0 && (
                                        <p className="text-xs text-center text-gray-400 py-2 border border-dashed rounded-lg">
                                            No items listed. Add one to track details.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Button
                                        className="w-full"
                                        type="button"
                                        onClick={handleUpdateMeal}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                                <div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setEditingMeal(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
