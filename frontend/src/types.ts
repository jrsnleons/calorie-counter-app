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
