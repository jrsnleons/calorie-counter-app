export interface User {
    id: number;
    username: string;
    name: string;
    avatar?: string;
    height?: number;
    weight?: number;
    age?: number;
    gender?: string;
    activity_level?: string;
    goal?: string;
    tdee?: number;
    current_streak?: number;
    longest_streak?: number;
    last_log_date?: string;
    total_days_logged?: number;
    created_at?: string;
}

export interface Meal {
    id: number;
    user_id: number;
    food_name: string;
    calories: number;
    protein: string | number; // Allowing both for flexibility, but DB is string
    carbs: string | number;
    fat: string | number;
    items?: string; // JSON string from DB
    meal_type: string;
    date: string;
}

export interface WeightLog {
    id: number;
    user_id: number;
    weight: number;
    date: string;
}

export interface Achievement {
    id: number;
    user_id: number;
    achievement_type: string;
    achievement_name: string;
    earned_at: string;
}

export interface StreakData {
    current_streak: number;
    longest_streak: number;
    total_days_logged: number;
    achievements: Achievement[];
}

export interface GoalWizardData {
    currentTdee: number;
    suggestedTdee: number;
    currentWeight: number;
    startWeight: number;
    weightChange: number;
    avgDailyCalories: number;
    goal: string;
    recommendation: string;
    daysTracked: number;
    weightEntries: number;
}

export interface OfflineAction {
    id: string;
    type: "add_meal" | "add_weight";
    payload: any;
    timestamp: number;
}
