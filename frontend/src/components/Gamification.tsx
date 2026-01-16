import { Card, CardContent } from "@/components/ui/card";
import type { StreakData } from "@/types";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Award,
    Calendar,
    Flame,
    Medal,
    Star,
    Target,
    Trophy,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface GamificationProps {
    onBack: () => void;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
    streak_3: <Flame className="w-6 h-6" />,
    streak_7: <Zap className="w-6 h-6" />,
    streak_30: <Trophy className="w-6 h-6" />,
    streak_100: <Award className="w-6 h-6" />,
    total_7: <Calendar className="w-6 h-6" />,
    total_30: <Star className="w-6 h-6" />,
    total_100: <Medal className="w-6 h-6" />,
    fast_16h: <Target className="w-6 h-6" />,
    fast_18h: <Target className="w-6 h-6" />,
    fast_20h: <Target className="w-6 h-6" />,
    fast_24h: <Trophy className="w-6 h-6" />,
};

const ACHIEVEMENT_COLORS: Record<string, string> = {
    streak_3: "from-orange-400 to-red-500",
    streak_7: "from-yellow-400 to-orange-500",
    streak_30: "from-purple-400 to-pink-500",
    streak_100: "from-amber-400 to-yellow-500",
    total_7: "from-blue-400 to-indigo-500",
    total_30: "from-green-400 to-emerald-500",
    total_100: "from-violet-400 to-purple-500",
    fast_16h: "from-cyan-400 to-blue-500",
    fast_18h: "from-teal-400 to-cyan-500",
    fast_20h: "from-emerald-400 to-teal-500",
    fast_24h: "from-amber-400 to-orange-500",
};

const ALL_ACHIEVEMENTS = [
    {
        type: "streak_3",
        name: "3-Day Streak",
        description: "Log meals 3 days in a row",
    },
    {
        type: "streak_7",
        name: "Week Warrior",
        description: "Log meals 7 days in a row",
    },
    {
        type: "streak_30",
        name: "Monthly Master",
        description: "Log meals 30 days in a row",
    },
    {
        type: "streak_100",
        name: "Century Logger",
        description: "Log meals 100 days in a row",
    },
    {
        type: "total_7",
        name: "First Week",
        description: "Log meals on 7 different days",
    },
    {
        type: "total_30",
        name: "Committed",
        description: "Log meals on 30 different days",
    },
    {
        type: "total_100",
        name: "Centurion",
        description: "Log meals on 100 different days",
    },
    {
        type: "fast_16h",
        name: "16h Fast Complete",
        description: "Complete a 16-hour fast",
    },
    {
        type: "fast_18h",
        name: "18h Fast Complete",
        description: "Complete an 18-hour fast",
    },
    {
        type: "fast_20h",
        name: "20h Fast Complete",
        description: "Complete a 20-hour fast",
    },
    {
        type: "fast_24h",
        name: "24h Fast Complete",
        description: "Complete a 24-hour fast",
    },
];

export function Gamification({ onBack }: GamificationProps) {
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStreakData();
    }, []);

    const loadStreakData = async () => {
        try {
            const res = await fetch("/api/streaks");
            if (res.ok) {
                const data = await res.json();
                setStreakData(data);
            }
        } catch (e) {
            console.error("Failed to load streak data", e);
        } finally {
            setLoading(false);
        }
    };

    const earnedTypes = new Set(
        streakData?.achievements.map((a) => a.achievement_type) || []
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">
                    Loading achievements...
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen bg-background p-4 pb-24"
        >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">Achievements</h1>
            </div>

            {/* Streak Display */}
            <Card className="mb-6 overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">
                                    Current Streak
                                </p>
                                <div className="flex items-center gap-2">
                                    <Flame className="w-8 h-8" />
                                    <span className="text-4xl font-bold">
                                        {streakData?.current_streak || 0}
                                    </span>
                                    <span className="text-xl">days</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-80">
                                    Best Streak
                                </p>
                                <p className="text-2xl font-bold">
                                    {streakData?.longest_streak || 0} days
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-primary">
                                {streakData?.total_days_logged || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Total Days Logged
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-primary">
                                {streakData?.achievements.length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Achievements Earned
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Streak Calendar Visualization */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Streak Progress
                    </h3>
                    <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: 30 }).map((_, i) => {
                            const daysAgo = 29 - i;
                            const isLogged =
                                daysAgo < (streakData?.current_streak || 0);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.02 }}
                                    className={`w-4 h-4 rounded-sm ${
                                        isLogged
                                            ? "bg-gradient-to-br from-green-400 to-emerald-500"
                                            : "bg-muted"
                                    }`}
                                    title={`${daysAgo} days ago`}
                                />
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Last 30 days
                    </p>
                </CardContent>
            </Card>

            {/* All Achievements */}
            <h3 className="font-semibold mb-4">All Achievements</h3>
            <div className="grid grid-cols-2 gap-3">
                {ALL_ACHIEVEMENTS.map((achievement, idx) => {
                    const isEarned = earnedTypes.has(achievement.type);
                    const earnedAch = streakData?.achievements.find(
                        (a) => a.achievement_type === achievement.type
                    );

                    return (
                        <motion.div
                            key={achievement.type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card
                                className={`overflow-hidden ${
                                    isEarned ? "" : "opacity-50"
                                }`}
                            >
                                <CardContent className="p-0">
                                    <div
                                        className={`p-4 ${
                                            isEarned
                                                ? `bg-gradient-to-br ${
                                                      ACHIEVEMENT_COLORS[
                                                          achievement.type
                                                      ] ||
                                                      "from-gray-400 to-gray-500"
                                                  } text-white`
                                                : "bg-muted"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            {ACHIEVEMENT_ICONS[
                                                achievement.type
                                            ] || <Award className="w-6 h-6" />}
                                            {isEarned && (
                                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                                    ✓ Earned
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm">
                                            {achievement.name}
                                        </h4>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs text-muted-foreground">
                                            {achievement.description}
                                        </p>
                                        {earnedAch && (
                                            <p className="text-xs text-primary mt-1">
                                                Earned{" "}
                                                {new Date(
                                                    earnedAch.earned_at
                                                ).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
