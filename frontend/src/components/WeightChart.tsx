import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface WeightData {
    date: string;
    weight: number;
}

export function WeightChart() {
    const [weightData, setWeightData] = useState<WeightData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const weight = await fetch("/api/stats/weight-trend").then((r) =>
                r.json()
            );
            setWeightData(weight);
        } catch (error) {
            console.error("Failed to fetch weight data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Loading chart...
            </div>
        );
    }

    if (weightData.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-muted-foreground">
                    No weight data available
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                    Start logging your weight to see trends
                </div>
            </div>
        );
    }

    const maxWeight = Math.max(...weightData.map((d) => d.weight));
    const minWeight = Math.min(...weightData.map((d) => d.weight));
    const range = maxWeight - minWeight;
    const padding = range * 0.1 || 1;

    const startWeight = weightData[0]?.weight || 0;
    const endWeight = weightData[weightData.length - 1]?.weight || 0;
    const weightChange = endWeight - startWeight;
    const percentChange =
        startWeight > 0
            ? ((weightChange / startWeight) * 100).toFixed(1)
            : "0.0";

    const getTrendIcon = () => {
        if (Math.abs(weightChange) < 0.1)
            return <Minus className="w-5 h-5 text-gray-500" />;
        if (weightChange > 0)
            return <TrendingUp className="w-5 h-5 text-red-500" />;
        return <TrendingDown className="w-5 h-5 text-green-500" />;
    };

    const getTrendColor = () => {
        if (Math.abs(weightChange) < 0.1) return "text-gray-600";
        if (weightChange > 0) return "text-red-600";
        return "text-green-600";
    };

    return (
        <div className="space-y-4">
            {/* Trend Summary */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div>
                    <div className="text-sm text-muted-foreground">
                        Weight Change
                    </div>
                    <div className={`text-2xl font-bold ${getTrendColor()}`}>
                        {weightChange > 0 ? "+" : ""}
                        {weightChange.toFixed(1)} kg
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getTrendIcon()}
                    <span
                        className={`text-lg font-semibold ${getTrendColor()}`}
                    >
                        {percentChange}%
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-64 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/10 rounded-xl p-4">
                <svg
                    className="w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="0.1"
                            className="text-gray-200 dark:text-gray-700"
                        />
                    ))}

                    {/* Area under curve */}
                    <defs>
                        <linearGradient
                            id="weightGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                stopColor="rgb(168, 85, 247)"
                                stopOpacity="0.4"
                            />
                            <stop
                                offset="100%"
                                stopColor="rgb(236, 72, 153)"
                                stopOpacity="0.1"
                            />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0 100 ${weightData
                            .map((d, i) => {
                                const x = (i / (weightData.length - 1)) * 100;
                                const y =
                                    100 -
                                    ((d.weight - (minWeight - padding)) /
                                        (maxWeight +
                                            padding -
                                            (minWeight - padding))) *
                                        100;
                                return `L ${x} ${y}`;
                            })
                            .join(" ")} L 100 100 Z`}
                        fill="url(#weightGradient)"
                    />

                    {/* Line */}
                    <polyline
                        points={weightData
                            .map((d, i) => {
                                const x = (i / (weightData.length - 1)) * 100;
                                const y =
                                    100 -
                                    ((d.weight - (minWeight - padding)) /
                                        (maxWeight +
                                            padding -
                                            (minWeight - padding))) *
                                        100;
                                return `${x},${y}`;
                            })
                            .join(" ")}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    <defs>
                        <linearGradient
                            id="lineGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                        >
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                            <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                        </linearGradient>
                    </defs>

                    {/* Data points */}
                    {weightData.map((d, i) => {
                        const x = (i / (weightData.length - 1)) * 100;
                        const y =
                            100 -
                            ((d.weight - (minWeight - padding)) /
                                (maxWeight + padding - (minWeight - padding))) *
                                100;
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="1"
                                fill="white"
                                stroke="rgb(168, 85, 247)"
                                strokeWidth="0.5"
                            />
                        );
                    })}
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground py-4">
                    <span>{(maxWeight + padding).toFixed(1)}</span>
                    <span>{minWeight.toFixed(1)}</span>
                </div>
            </div>

            {/* Date labels */}
            <div className="flex justify-between text-xs text-muted-foreground px-4">
                <span>{new Date(weightData[0].date).toLocaleDateString()}</span>
                <span>
                    {new Date(
                        weightData[weightData.length - 1].date
                    ).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}
