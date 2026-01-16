import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@/types";
import { useEffect, useState } from "react";

interface ChartsProps {
    user: User;
}

interface CalorieData {
    date: string;
    total_calories: number;
}

export function Charts({ user }: ChartsProps) {
    const [weeklyData, setWeeklyData] = useState<CalorieData[]>([]);
    const [monthlyData, setMonthlyData] = useState<CalorieData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [weekly, monthly] = await Promise.all([
                fetch("/api/stats/weekly").then((r) => r.json()),
                fetch("/api/stats/monthly").then((r) => r.json()),
            ]);
            setWeeklyData(weekly);
            setMonthlyData(monthly);
        } catch (e) {
            console.error("Failed to load chart data", e);
        } finally {
            setLoading(false);
        }
    };

    const tdee = user.tdee || 2000;

    // Calculate stats
    const weeklyAvg =
        weeklyData.length > 0
            ? Math.round(
                  weeklyData.reduce(
                      (sum, d) => sum + Number(d.total_calories),
                      0
                  ) / weeklyData.length
              )
            : 0;
    const monthlyAvg =
        monthlyData.length > 0
            ? Math.round(
                  monthlyData.reduce(
                      (sum, d) => sum + Number(d.total_calories),
                      0
                  ) / monthlyData.length
              )
            : 0;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const BarChart = ({
        data,
        showGoal = true,
    }: {
        data: CalorieData[];
        showGoal?: boolean;
    }) => {
        const max =
            Math.max(...data.map((d) => Number(d.total_calories)), tdee) * 1.1;

        return (
            <div className="space-y-2">
                {data.map((item, idx) => {
                    const calories = Number(item.total_calories);
                    const percentage = (calories / max) * 100;
                    const goalPercentage = (tdee / max) * 100;
                    const isOverGoal = calories > tdee;

                    return (
                        <div key={idx} className="relative">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-16 shrink-0">
                                    {formatDate(item.date)}
                                </span>
                                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                                    {showGoal && (
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"
                                            style={{
                                                left: `${goalPercentage}%`,
                                            }}
                                        />
                                    )}
                                    <div
                                        className={`h-full rounded-lg transition-all duration-500 ${
                                            isOverGoal
                                                ? "bg-gradient-to-r from-orange-400 to-red-500"
                                                : "bg-gradient-to-r from-emerald-400 to-green-500"
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span
                                    className={`text-sm font-medium w-16 text-right ${
                                        isOverGoal
                                            ? "text-red-500"
                                            : "text-green-600"
                                    }`}
                                >
                                    {calories}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {showGoal && (
                    <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span>Goal: {tdee} cal</span>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">
                    Loading charts...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 border-0">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            Weekly Avg
                        </p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {weeklyAvg}
                        </p>
                        <p className="text-xs text-muted-foreground">cal/day</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-0">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            Monthly Avg
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {monthlyAvg}
                        </p>
                        <p className="text-xs text-muted-foreground">cal/day</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="weekly" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="weight">Weight</TabsTrigger>
                </TabsList>

                <TabsContent value="weekly">
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="font-semibold mb-4">Last 7 Days</h3>
                            {weeklyData.length > 0 ? (
                                <BarChart data={weeklyData} />
                            ) : (
                                <p className="text-center py-8 text-muted-foreground">
                                    No data for the past week. Start logging
                                    meals!
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="monthly">
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="font-semibold mb-4">Last 30 Days</h3>
                            {monthlyData.length > 0 ? (
                                <BarChart data={monthlyData} />
                            ) : (
                                <p className="text-center py-8 text-muted-foreground">
                                    No data for the past month. Start logging
                                    meals!
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
