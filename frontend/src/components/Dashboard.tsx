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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion } from "framer-motion";
import {
    Camera,
    Loader2,
    LogOut,
    Settings as SettingsIcon,
    Trash2,
    Type,
    Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings } from "./Settings";

interface Meal {
    id: number;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
    items?: string;
}

interface AnalysisResult {
    short_title: string;
    total_calories: number;
    summary: string;
}

export function Dashboard({
    user,
    onLogout,
}: {
    user: any;
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
    const [shake, setShake] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const res = await fetch("/api/history");
        const data = await res.json();
        setHistory(data);
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
                    className={`max-w-2xl mx-auto p-4 space-y-6 pb-20 ${
                        shake ? "animate-shake" : ""
                    }`}
                >
                    <div className="flex justify-between items-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-purple-100 dark:border-purple-900 sticky top-4 z-10 transition-all duration-300">
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
                                        <Type className="w-4 h-4 mr-2" /> Text
                                        Mode
                                    </TabsTrigger>
                                </TabsList>

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
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {result.summary}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <h2 className="text-xl font-semibold px-1">
                        📅 Recent History
                    </h2>
                    <div className="space-y-4">
                        {history.length === 0 && (
                            <p className="text-center text-gray-500">
                                No meals yet.
                            </p>
                        )}
                        {history.map((meal) => {
                            let items: any[] = [];
                            try {
                                items = JSON.parse(meal.items || "[]");
                            } catch (e) {}

                            return (
                                <Card
                                    key={meal.id}
                                    className="relative overflow-hidden group hover:shadow-md transition-all border-none bg-white dark:bg-zinc-900/50 shadow-sm"
                                >
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Delete Meal Entry?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete
                                                    "{meal.food_name}" from your
                                                    history. This action cannot
                                                    be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() =>
                                                        deleteMeal(meal.id)
                                                    }
                                                    className="bg-red-500 hover:bg-red-600 text-white"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start pr-10">
                                            <h3 className="font-bold text-lg">
                                                {meal.food_name}
                                            </h3>
                                            <span className="font-bold text-purple-600 dark:text-purple-400 text-lg whitespace-nowrap">
                                                {meal.calories} kcal
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {meal.date}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mr-2">
                                                P: {meal.protein}g
                                            </span>
                                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mr-2">
                                                C: {meal.carbs}g
                                            </span>
                                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                F: {meal.fat}g
                                            </span>
                                        </div>
                                        {items.length > 0 && (
                                            <div className="mt-3 pt-3 border-t dark:border-gray-800 text-sm text-gray-500 space-y-1">
                                                {items.map((it, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex justify-between"
                                                    >
                                                        <span>• {it.name}</span>
                                                        <span>
                                                            {it.calories}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
