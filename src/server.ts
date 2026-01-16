import { GoogleGenerativeAI } from "@google/generative-ai";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import path from "path";
import { z } from "zod";
import { pool, query } from "./database";

class RequestQueue {
    private queue: (() => Promise<void>)[] = [];
    private activeCount = 0;
    private readonly concurrency: number;

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const wrapper = async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    console.error(`[Queue] Task failed:`, err);
                    reject(err);
                } finally {
                    this.activeCount--;
                    this.next();
                }
            };

            if (this.activeCount < this.concurrency) {
                this.activeCount++;
                wrapper();
            } else {
                this.queue.push(wrapper);
            }
        });
    }

    private next() {
        if (this.activeCount < this.concurrency && this.queue.length > 0) {
            this.activeCount++;
            const task = this.queue.shift();
            task?.();
        }
    }
}

// Global queue for AI operations (limit to 5 concurrent reqs)
const aiQueue = new RequestQueue(5);

dotenv.config();

// Extend Session Data Interface
declare module "express-session" {
    interface SessionData {
        userId: number;
        user?: any; // You can define a stricter User interface later
    }
}

const app = express();

app.use(helmet());

// Rate Limiter: 100 reqs per 15 mins
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true, 
    legacyHeaders: false,
});
app.use(limiter);

app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// Initialize Google Auth Client
const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
    console.warn("GOOGLE_CLIENT_ID is not set in environment variables.");
}
const client = new OAuth2Client(googleClientId);

// Initialize DB Session Store
const PgSession = connectPgSimple(session);

// CORS configuration for separate frontend deployment
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://pakals.up.railway.app",
    "http://localhost:5173",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl) but only in development
            if (!origin && process.env.NODE_ENV !== "production") {
                return callback(null, allowedOrigins[0]);
            }
            if (!origin) {
                return callback(new Error("Origin required"));
            }
            if (
                allowedOrigins.some((allowed) =>
                    origin.startsWith(allowed.replace(/\/$/, ""))
                )
            ) {
                callback(null, origin); // Return the specific origin, not true
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/config", (req: Request, res: Response) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
});

app.use(
    session({
        store: new PgSession({
            pool: pool,
            tableName: "session",
            createTableIfMissing: true,
            errorLog: (err: any) => console.error("Session Store Error:", err),
        }),
        secret: process.env.SESSION_SECRET || "supersecretkey123",
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            httpOnly: true,
        },
    })
);

// Initialize Gemini AI
const apiKey = process.env.API_KEY || "";
if (!apiKey) console.warn("API_KEY for Gemini is missing");
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// --- AUTH ROUTES ---

app.post(
    "/api/auth/google",
    async (req: Request, res: Response): Promise<any> => {
        const { token } = req.body;

        try {
            if (!process.env.GOOGLE_CLIENT_ID)
                throw new Error("Google Client ID missing");

            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res
                    .status(400)
                    .json({ error: "Invalid Google Token Payload" });
            }

            const googleEmail = payload.email;
            const googleName = payload.name;
            const googlePicture = payload.picture;

            const userRes = await query(
                `SELECT * FROM users WHERE username = $1`,
                [googleEmail]
            );
            let user = userRes.rows[0];

            if (!user) {
                const result = await query(
                    `INSERT INTO users (username, password, name, avatar) VALUES ($1, $2, $3, $4) RETURNING *`,
                    [
                        googleEmail,
                        "GOOGLE_LOGIN_ONLY",
                        googleName,
                        googlePicture,
                    ]
                );
                user = result.rows[0];
            } else {
                await query(
                    `UPDATE users SET name = $1, avatar = $2 WHERE id = $3`,
                    [googleName, googlePicture, user.id]
                );
            }

            req.session.userId = user.id;
            res.json({ success: true, username: googleEmail });
        } catch (error) {
            console.error("Google Auth Error:", error);
            res.status(401).json({ error: "Invalid Google Token" });
        }
    }
);

// Removed /api/register and /api/login in favor of Google Auth Only

app.post("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) console.error("Logout error", err);
        res.json({ success: true });
    });
});

app.get("/api/me", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const result = await query("SELECT * FROM users WHERE id = $1", [
        req.session.userId,
    ]);
    res.json({ loggedIn: true, user: result.rows[0] });
});

// --- ZOD SCHEMAS ---
const UpdateUserSchema = z.object({
  tdee: z.number().int().min(500).max(10000).optional(),
  goal: z.enum(['lose', 'maintain', 'gain']).optional(),
  height: z.number().int().min(50).max(300).optional(),
  weight: z.number().min(20).max(500).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
});

// --- USER SETTINGS ENDPOINTS ---

app.post("/api/user/update", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Validate Input
    const parse = UpdateUserSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.issues[0].message });
    }

    try {
        const { tdee, goal, height, weight, activity_level } = parse.data;
        const updates = [];
        const values: any[] = [];
        let idx = 1;

        if (tdee !== undefined) { updates.push(`tdee = $${idx++}`); values.push(tdee); }
        if (goal !== undefined) { updates.push(`goal = $${idx++}`); values.push(goal); }
        if (height !== undefined) { updates.push(`height = $${idx++}`); values.push(height); }
        if (weight !== undefined) { updates.push(`weight = $${idx++}`); values.push(weight); }
        if (activity_level !== undefined) { updates.push(`activity_level = $${idx++}`); values.push(activity_level); }

        if (updates.length === 0) return res.json({ success: true, message: "No changes" });

        values.push(req.session.userId);
        const q = `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`;
        
        const result = await query(q, values);
        res.json({ success: true, user: result.rows[0] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/user/delete", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        // Due to CASCADE in schema, this deletes meals/logs/etc automatically
        // If schema isn't migrated yet, we should manually delete to be safe, but we updated schema.sql.
        // For safety in this hybrid state:
        await query(`DELETE FROM meals WHERE user_id = $1`, [req.session.userId]);
        await query(`DELETE FROM weight_logs WHERE user_id = $1`, [req.session.userId]);
        await query(`DELETE FROM achievements WHERE user_id = $1`, [req.session.userId]);
        await query(`DELETE FROM users WHERE id = $1`, [req.session.userId]);

        req.session.destroy((err) => {
             res.json({ success: true });
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- CHARTS/STATS ROUTES ---

// Get weekly calorie data
app.get(
    "/api/stats/weekly",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        try {
            const result = await query(
                `SELECT date, SUM(calories) as total_calories
             FROM meals
             WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '7 days')::TEXT
             GROUP BY date
             ORDER BY date ASC`,
                [req.session.userId]
            );
            res.json(result.rows);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// Get monthly calorie data
app.get(
    "/api/stats/monthly",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        try {
            const result = await query(
                `SELECT date, SUM(calories) as total_calories
             FROM meals
             WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '30 days')::TEXT
             GROUP BY date
             ORDER BY date ASC`,
                [req.session.userId]
            );
            res.json(result.rows);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// Get weight trend data
app.get(
    "/api/stats/weight-trend",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        try {
            const result = await query(
                `SELECT date, weight
             FROM weight_logs
             WHERE user_id = $1
             ORDER BY date ASC
             LIMIT 30`,
                [req.session.userId]
            );
            res.json(result.rows);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// --- STREAKS/GAMIFICATION ROUTES ---

// Get user streaks and achievements
app.get("/api/streaks", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    try {
        const userResult = await query(
            `SELECT current_streak, longest_streak, last_log_date, total_days_logged FROM users WHERE id = $1`,
            [req.session.userId]
        );
        const achievementsResult = await query(
            `SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC`,
            [req.session.userId]
        );
        res.json({
            ...userResult.rows[0],
            achievements: achievementsResult.rows,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update streak (called after logging a meal) - Goal-based streak logic
app.post(
    "/api/streaks/update",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        try {
            const today = new Date().toISOString().split("T")[0];

            // Get user data including goal and TDEE
            const userResult = await query(
                `SELECT current_streak, longest_streak, last_log_date, total_days_logged, goal, tdee FROM users WHERE id = $1`,
                [req.session.userId]
            );

            let {
                current_streak = 0,
                longest_streak = 0,
                last_log_date,
                total_days_logged = 0,
                goal,
                tdee = 2000,
            } = userResult.rows[0] || {};

            // Get today's total calories
            const caloriesResult = await query(
                `SELECT COALESCE(SUM(calories), 0) as total FROM meals WHERE user_id = $1 AND date = $2`,
                [req.session.userId, today]
            );
            const todayCalories = Number(caloriesResult.rows[0]?.total || 0);

            // Determine if streak should count based on goal
            let meetsGoal = false;
            const tolerance = tdee * 0.1; // 10% tolerance for maintain

            if (goal === "Lose Weight" || goal === "lose") {
                // For weight loss: calories should be at or under TDEE
                meetsGoal = todayCalories <= tdee && todayCalories > 0;
            } else if (goal === "Gain Muscle" || goal === "gain") {
                // For muscle gain: calories should meet or exceed TDEE
                meetsGoal = todayCalories >= tdee;
            } else {
                // For maintain: calories should be within 10% of TDEE
                meetsGoal =
                    todayCalories >= tdee - tolerance &&
                    todayCalories <= tdee + tolerance;
            }

            // If already logged today, just check if they now meet the goal
            if (last_log_date === today) {
                // Return current streak status and whether goal is met
                return res.json({
                    current_streak,
                    longest_streak,
                    total_days_logged,
                    newAchievements: [],
                    meetsGoal,
                    todayCalories,
                    goal,
                    tdee,
                });
            }

            // New day - only count streak if goal is met
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            if (meetsGoal) {
                if (last_log_date === yesterdayStr) {
                    current_streak += 1;
                } else {
                    current_streak = 1;
                }

                if (current_streak > longest_streak) {
                    longest_streak = current_streak;
                }
            }

            total_days_logged += 1;

            await query(
                `UPDATE users SET current_streak = $1, longest_streak = $2, last_log_date = $3, total_days_logged = $4 WHERE id = $5`,
                [
                    current_streak,
                    longest_streak,
                    today,
                    total_days_logged,
                    req.session.userId,
                ]
            );

            // Check for new achievements
            const newAchievements: string[] = [];
            const achievementChecks = [
                {
                    type: "streak_3",
                    name: "3-Day Streak",
                    condition: current_streak >= 3,
                },
                {
                    type: "streak_7",
                    name: "Week Warrior",
                    condition: current_streak >= 7,
                },
                {
                    type: "streak_30",
                    name: "Monthly Master",
                    condition: current_streak >= 30,
                },
                {
                    type: "streak_100",
                    name: "Century Logger",
                    condition: current_streak >= 100,
                },
                {
                    type: "total_7",
                    name: "First Week",
                    condition: total_days_logged >= 7,
                },
                {
                    type: "total_30",
                    name: "Committed",
                    condition: total_days_logged >= 30,
                },
                {
                    type: "total_100",
                    name: "Centurion",
                    condition: total_days_logged >= 100,
                },
            ];

            for (const ach of achievementChecks) {
                if (ach.condition) {
                    const existing = await query(
                        `SELECT id FROM achievements WHERE user_id = $1 AND achievement_type = $2`,
                        [req.session.userId, ach.type]
                    );
                    if (existing.rows.length === 0) {
                        await query(
                            `INSERT INTO achievements (user_id, achievement_type, achievement_name) VALUES ($1, $2, $3)`,
                            [req.session.userId, ach.type, ach.name]
                        );
                        newAchievements.push(ach.name);
                    }
                }
            }

            res.json({
                current_streak,
                longest_streak,
                total_days_logged,
                newAchievements,
                meetsGoal,
                todayCalories,
                goal,
                tdee,
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// --- GOAL ADJUSTMENT WIZARD ---

app.post(
    "/api/goal-wizard",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        try {
            // Get user data
            const userResult = await query(
                `SELECT * FROM users WHERE id = $1`,
                [req.session.userId]
            );
            const user = userResult.rows[0];

            // Get weight logs from last 4 weeks
            const weightResult = await query(
                `SELECT weight, date FROM weight_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 28`,
                [req.session.userId]
            );

            // Get calorie intake from last 4 weeks
            const calorieResult = await query(
                `SELECT date, SUM(calories) as total_calories
             FROM meals
             WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '28 days')::TEXT
             GROUP BY date`,
                [req.session.userId]
            );

            const weights = weightResult.rows;
            const calories = calorieResult.rows;

            // Calculate trends
            let weightChange = 0;
            let avgCalories = 0;
            let recommendation = "";
            let suggestedTdee = user.tdee;

            if (weights.length >= 2) {
                weightChange =
                    weights[0].weight - weights[weights.length - 1].weight;
            }

            if (calories.length > 0) {
                avgCalories = Math.round(
                    calories.reduce(
                        (sum: number, c: any) => sum + Number(c.total_calories),
                        0
                    ) / calories.length
                );
            }

            // Generate recommendations based on goal
            const goal = user.goal || "maintain";
            const weeklyChange = (weightChange / weights.length) * 7;

            if (goal === "lose" || goal === "Lose Weight") {
                if (weeklyChange > 0) {
                    recommendation =
                        "You're gaining weight. Consider reducing daily calories by 200-300.";
                    suggestedTdee = Math.max(1200, user.tdee - 250);
                } else if (weeklyChange < -1) {
                    recommendation =
                        "You're losing weight too fast. Increase calories slightly for sustainable loss.";
                    suggestedTdee = user.tdee + 150;
                } else if (weeklyChange >= -1 && weeklyChange <= -0.2) {
                    recommendation =
                        "Great progress! You're on track for healthy weight loss.";
                } else {
                    recommendation =
                        "Weight is stable. Reduce calories by 200-300 to start losing.";
                    suggestedTdee = user.tdee - 200;
                }
            } else if (goal === "gain" || goal === "Gain Muscle") {
                if (weeklyChange < 0) {
                    recommendation =
                        "You're losing weight. Increase daily calories by 200-300.";
                    suggestedTdee = user.tdee + 250;
                } else if (weeklyChange > 0.5) {
                    recommendation = "You're gaining well. Keep it up!";
                } else {
                    recommendation =
                        "Weight is stable. Increase calories by 200-300 to start gaining.";
                    suggestedTdee = user.tdee + 200;
                }
            } else {
                if (Math.abs(weeklyChange) > 0.5) {
                    recommendation =
                        "Weight is fluctuating. Your current intake may need adjustment.";
                    suggestedTdee = avgCalories > 0 ? avgCalories : user.tdee;
                } else {
                    recommendation =
                        "You're maintaining well! Keep up the good work.";
                }
            }

            // Calculate standard scientific baseline (Mifflin-St Jeor)
            // ensuring we import or use the function defined earlier in the file
            const scientificCalc = calculateTDEE(
                user.weight,
                user.height,
                user.age,
                user.gender,
                user.activity_level,
                goal
            );

            // If we have little data, prefer the scientific calculation
            if (weights.length < 2 || calories.length < 7) {
                suggestedTdee = scientificCalc.target;
                recommendation =
                    "Not enough history yet. Calculated based on your profile stats.";
            }

            res.json({
                currentTdee: user.tdee,
                suggestedTdee: Math.round(suggestedTdee),
                currentWeight: weights[0]?.weight || user.weight,
                startWeight: weights[weights.length - 1]?.weight || user.weight,
                weightChange: Math.round(weightChange * 10) / 10,
                avgDailyCalories: avgCalories,
                goal: user.goal,
                recommendation,
                daysTracked: calories.length,
                weightEntries: weights.length,
                maintenance: scientificCalc.maintenance,
                bmr: scientificCalc.bmr,
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// Update TDEE from wizard
app.post(
    "/api/goal-wizard/apply",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        const { tdee, goal } = req.body;

        try {
            await query(`UPDATE users SET tdee = $1, goal = $2 WHERE id = $3`, [
                tdee,
                goal,
                req.session.userId,
            ]);
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
);

// --- OFFLINE SYNC ROUTES ---

app.post("/api/sync", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const { actions } = req.body; // Array of offline actions

    try {
        const results = [];
        for (const action of actions) {
            if (action.type === "add_meal") {
                const {
                    food_name,
                    calories,
                    protein,
                    carbs,
                    fat,
                    items,
                    date,
                    meal_type,
                } = action.payload;
                await query(
                    `INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, items, date, meal_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        req.session.userId,
                        food_name,
                        calories,
                        protein,
                        carbs,
                        fat,
                        items,
                        date,
                        meal_type,
                    ]
                );
                results.push({ id: action.id, success: true });
            } else if (action.type === "add_weight") {
                const { weight, date } = action.payload;
                await query(
                    `INSERT INTO weight_logs (user_id, weight, date) VALUES ($1, $2, $3)`,
                    [req.session.userId, weight, date]
                );
                results.push({ id: action.id, success: true });
            }
        }
        res.json({ results });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- APP ROUTES ---

app.get("/api/history", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const result = await query(
        `SELECT * FROM meals WHERE user_id = $1 ORDER BY id DESC`,
        [req.session.userId]
    );
    res.json(result.rows);
});

app.post("/api/analyze", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    try {
        const { food, image } = req.body;

        // Clean Base64 image string
        let cleanImage = image;
        if (image && typeof image === "string" && image.includes("base64,")) {
            cleanImage = image.split("base64,")[1];
        }

        const prompt = `
        Analyze this input (image or text).
        1. If it's an image, check if it contains food/drink.
        2. If it's text, check if it describes a edible food item (reject nonsense, insults, or non-food items like "rocks" or "happiness").

        Return a strict JSON object with this structure:
        {
            "is_food": boolean,
            "funny_comment": "If is_food is false, write a short, sarcastic roasting comment about why this input is nonsense or not food.",
            "short_title": "A concise 3-5 word name for this meal",
            "items": [{"name": "string", "calories": int, "protein": "str", "carbs": "str", "fat": "str"}],
            "total_calories": int,
            "total_protein": "str",
            "total_carbs": "str",
            "total_fat": "str",
            "summary": "string"
        }`;

        const inputParts: any[] = [prompt];
        if (food) inputParts.push(food);
        if (cleanImage) {
            inputParts.push({
                inlineData: { data: cleanImage, mimeType: "image/jpeg" },
            });
        }

        const result = await aiQueue.add(() =>
            model.generateContent(inputParts)
        );

        const responseText = result.response.text();

        // Robust JSON extraction
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error(
                `[Analyze] No JSON found in response: ${responseText.substring(
                    0,
                    100
                )}...`
            );
            throw new Error("No JSON found in response");
        }

        const data = JSON.parse(jsonMatch[0]);

        // Guardrail Check
        if (data.is_food === false) {
            console.warn(
                `[Analyze] Guardrail triggered: Not food. Reason: ${data.funny_comment}`
            );
            return res.json({
                error: data.funny_comment || "That doesn't look like food!",
                is_food: false,
            });
        }

        const today = new Date().toISOString().split("T")[0];
        const itemsJson = JSON.stringify(data.items || []);
        const mealType = req.body.meal_type || "Snack";

        // Safely parse calories to integer
        const calories = parseInt(String(data.total_calories || 0));

        await query(
            `INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, items, date, meal_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                req.session.userId,
                data.short_title || "Scanned Meal",
                calories,
                String(data.total_protein || "0g"),
                String(data.total_carbs || "0g"),
                String(data.total_fat || "0g"),
                itemsJson,
                today,
                mealType,
            ]
        );

        data.meal_type = mealType;
        res.json(data);
    } catch (error) {
        console.error("AI Analysis Error:", error);
        res.status(500).json({ error: "Failed to analyze meal" });
    }
});

app.delete(
    "/api/history/:id",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        const mealId = req.params.id;

        try {
            await query(`DELETE FROM meals WHERE id = $1 AND user_id = $2`, [
                mealId,
                req.session.userId,
            ]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Could not delete" });
        }
    }
);

app.get("/api/weight", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const result = await query(
            "SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY date DESC",
            [req.session.userId]
        );
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/weight", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const { weight, date } = req.body;

    try {
        // 1. Log the weight history
        await query(
            "INSERT INTO weight_logs (user_id, weight, date) VALUES ($1, $2, $3)",
            [req.session.userId, weight, date]
        );

        // 2. Fetch current user stats BEFORE update
        const userRes = await query(
            "SELECT height, age, gender, activity_level, goal, tdee FROM users WHERE id = $1",
            [req.session.userId]
        );
        const user = userRes.rows[0];

        // 3. Update the user profile with new weight
        await query("UPDATE users SET weight = $1 WHERE id = $2", [
            weight,
            req.session.userId,
        ]);

        if (req.session.user) req.session.user.weight = weight;

        // 4. Calculate what the new TDEE *would* be
        let suggestedTDEE = null;
        if (user && user.height && user.age && user.gender) {
            const calc = calculateTDEE(
                weight,
                user.height,
                user.age,
                user.gender,
                user.activity_level,
                user.goal
            );
            suggestedTDEE = calc.target;
        }

        res.json({
            success: true,
            suggestedTDEE,
            currentTDEE: user?.tdee,
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post(
    "/api/user/onboarding",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });
        const { height, weight, age, gender, activity_level, goal, tdee } =
            req.body;

        try {
            await query(
                `UPDATE users SET height = $1, weight = $2, age = $3, gender = $4, activity_level = $5, goal = $6, tdee = $7 WHERE id = $8`,
                [
                    height,
                    weight,
                    age,
                    gender,
                    activity_level,
                    goal,
                    tdee,
                    req.session.userId,
                ]
            );
            req.session.user = {
                ...req.session.user,
                height,
                weight,
                age,
                gender,
                activity_level,
                goal,
                tdee,
            };
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Database error" });
        }
    }
);

// Update User Profile & Calculate TDEE
// Helper: Calculate TDEE robustly
function calculateTDEE(
    weight: number,
    height: number,
    age: number,
    gender: string,
    activityLevel: string,
    goal: string = "maintain"
) {
    // Ensure inputs are numbers and valid
    const w = Number(weight) || 0;
    const h = Number(height) || 0;
    const a = Number(age) || 0;

    // Mifflin-St Jeor Equation
    let bmr = 10 * w + 6.25 * h - 5 * a;
    if (gender === "Male" || gender === "male") bmr += 5;
    else bmr -= 161; // Female

    // Activity Multipliers
    const multipliers: Record<string, number> = {
        Sedentary: 1.2,
        sedentary: 1.2,
        Light: 1.375,
        light: 1.375,
        Moderate: 1.55,
        moderate: 1.55,
        Active: 1.725,
        active: 1.725,
        "Very Active": 1.9,
        very_active: 1.9,
    };

    const activity = activityLevel || "sedentary";
    const multiplier = multipliers[activity] || 1.2;

    const tdee = Math.round(bmr * multiplier);

    let goalCalories = tdee;
    const goalLower = goal?.toLowerCase() || "maintain";

    if (goalLower.includes("lose")) goalCalories -= 500;
    else if (goalLower.includes("gain")) goalCalories += 500;

    return {
        bmr: Math.round(bmr),
        maintenance: tdee,
        target: Math.round(goalCalories),
    };
}

app.put("/api/user", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    // Note: 'weight' is ignored here if we want to enforce updates via weight tab,
    // but the frontend sends it via formData.
    // We will update detailed profile stats but NOT the tdee (daily goal).
    const { name, height, weight, age, gender, activity_level } = req.body;

    try {
        // 1. Update Profile Stats Only
        // We do NOT update 'tdee' automatically anymore.
        // We do NOT update 'weight' from this endpoint if we want to rely on the weight tab,
        // but for settings consistency we can update the 'profile weight' (current_weight).
        // However, user asked "remove the change of weight" from settings earlier.
        // But the user might still send it. Let's respect the legacy behavior for weight
        // IF it's passed, but preferably we focus on the other stats.
        // The user request said "settings ... remove the change of weight",
        // which we did in the frontend (readonly).
        // So here we only expect height/age/gender/activity updates mainly.

        await query(
            `UPDATE users SET name=$1, height=$2, age=$3, gender=$4, activity_level=$5 WHERE id=$6`,
            [name, height, age, gender, activity_level, req.session.userId]
        );

        // 2. Fetch fresh user data to calculate suggestion
        const userRes = await query("SELECT * FROM users WHERE id = $1", [
            req.session.userId,
        ]);
        const user = userRes.rows[0];

        // 3. Calculate suggestion
        const calc = calculateTDEE(
            user.weight, // Use stored weight
            user.height,
            user.age,
            user.gender,
            user.activity_level,
            user.goal
        );

        res.json({
            success: true,
            user: user,
            suggestedTDEE: calc.target,
            maintenance: calc.maintenance,
            message: "Profile updated. Goal was not changed.",
        });
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// AI-Powered Meal Update
app.post(
    "/api/update-meal-ai",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        const { mealId, currentMeal, editPrompt } = req.body;

        if (!editPrompt || !mealId || !currentMeal) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        try {
            const result = await aiQueue.add(async () => {
                const genAI = new GoogleGenerativeAI(
                    process.env.GEMINI_API_KEY || ""
                );
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                });

                const prompt = `You are a nutrition assistant. A user has a logged meal and wants to update it.

Current meal:
- Food name: ${currentMeal.food_name}
- Calories: ${currentMeal.calories}
- Protein: ${currentMeal.protein}
- Carbs: ${currentMeal.carbs}
- Fat: ${currentMeal.fat}
- Items: ${currentMeal.items || "None"}

User's edit request: "${editPrompt}"

Based on the user's request, provide the updated meal information. If they're adding food, increase values. If they're removing or reducing, decrease values. Be reasonable with estimates.

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
{
  "food_name": "updated name",
  "calories": number,
  "protein": "Xg",
  "carbs": "Xg",
  "fat": "Xg",
  "items": [{"name": "item name", "calories": number}]
}`;

                const aiResponse = await model.generateContent(prompt);
                const text = aiResponse.response.text().trim();

                // Remove markdown code blocks if present
                let cleanText = text;
                if (text.startsWith("```")) {
                    cleanText = text
                        .replace(/```json\n?/g, "")
                        .replace(/```\n?/g, "")
                        .trim();
                }

                const parsed = JSON.parse(cleanText);

                // Update the meal in database
                await query(
                    `UPDATE meals SET food_name=$1, calories=$2, protein=$3, carbs=$4, fat=$5, items=$6 WHERE id=$7 AND user_id=$8`,
                    [
                        parsed.food_name,
                        parsed.calories,
                        parsed.protein,
                        parsed.carbs,
                        parsed.fat,
                        JSON.stringify(parsed.items || []),
                        mealId,
                        req.session.userId,
                    ]
                );

                return { success: true, updated: parsed };
            });

            res.json(result);
        } catch (error: any) {
            console.error("AI Update Error:", error);
            res.status(500).json({
                error: "Failed to update meal with AI. Please try again.",
            });
        }
    }
);

// Update Meal
app.put(
    "/api/history/:id",
    async (req: Request, res: Response): Promise<any> => {
        if (!req.session.userId)
            return res.status(401).json({ error: "Unauthorized" });

        const mealId = req.params.id;
        const { food_name, calories, protein, carbs, fat, meal_type, items } =
            req.body;

        try {
            await query(
                `UPDATE meals SET food_name=$1, calories=$2, protein=$3, carbs=$4, fat=$5, meal_type=$6, items=$7 WHERE id=$8 AND user_id=$9`,
                [
                    food_name,
                    calories,
                    protein,
                    carbs,
                    fat,
                    meal_type,
                    items ? JSON.stringify(items) : null,
                    mealId,
                    req.session.userId,
                ]
            );
            res.json({ success: true });
        } catch (error) {
            console.error("Update Error:", error);
            res.status(500).json({ error: "Could not update meal" });
        }
    }
);

// Health check endpoint for Railway
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- ADMIN API ENDPOINTS ---
const adminAuth = (req: Request, res: Response, next: any) => {
    const secret = req.headers["x-admin-secret"];
    const validSecret = process.env.ADMIN_SECRET;
    
    // Critical Security Check: If no secret is configured, disable admin access completely.
    if (!validSecret) {
        console.error("[CRITICAL SECURITY] ADMIN_SECRET env var is not set. Locking down admin panel.");
        return res.status(500).json({ error: "Server Configuration Error: Admin Access Disabled" });
    }
    
    if (secret !== validSecret) {
        console.log(`[Admin Auth Failed]`);
        res.status(401).json({ error: "Unauthorized Admin Access" });
    } else {
        next();
    }
};

app.get("/api/admin/stats", adminAuth, async (req: Request, res: Response) => {
    try {
        const userCount = await query(`SELECT COUNT(*) FROM users`);
        const mealCount = await query(`SELECT COUNT(*) FROM meals`);
        const weightCount = await query(`SELECT COUNT(*) FROM weight_logs`);
        
        res.json({
            users: parseInt(userCount.rows[0].count),
            meals: parseInt(mealCount.rows[0].count),
            weight_logs: parseInt(weightCount.rows[0].count)
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/admin/users", adminAuth, async (req: Request, res: Response) => {
    try {
        // Return most recent 50 users
        const result = await query(`
            SELECT id, name, username, created_at, last_log_date, current_streak 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Admin "Hotfix" - Update User TDEE/Stats manually
app.post("/api/admin/users/:id/update", adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { tdee, goal, name, current_streak, height, weight, activity_level } = req.body;
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        let idx = 1;
        
        if (tdee !== undefined) { updates.push(`tdee = $${idx++}`); values.push(tdee); }
        if (goal !== undefined) { updates.push(`goal = $${idx++}`); values.push(goal); }
        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (current_streak !== undefined) { updates.push(`current_streak = $${idx++}`); values.push(current_streak); }
        if (height !== undefined) { updates.push(`height = $${idx++}`); values.push(height); }
        if (weight !== undefined) { updates.push(`weight = $${idx++}`); values.push(weight); }
        if (activity_level !== undefined) { updates.push(`activity_level = $${idx++}`); values.push(activity_level); }
        
        if (updates.length === 0) return res.json({ message: "No changes" });
        
        values.push(id);
        const q = `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`;
        
        const result = await query(q, values);
        res.json({ success: true, user: result.rows[0] });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/admin/users/:id", adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Delete related data first (foreign keys)
        await query(`DELETE FROM meals WHERE user_id = $1`, [id]);
        await query(`DELETE FROM weight_logs WHERE user_id = $1`, [id]);
        await query(`DELETE FROM achievements WHERE user_id = $1`, [id]);
        // Finally delete user
        await query(`DELETE FROM users WHERE id = $1`, [id]);
        
        res.json({ success: true, message: "User deleted" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/admin/users/:id/history", adminAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const meals = await query(`SELECT * FROM meals WHERE user_id = $1 ORDER BY date DESC LIMIT 50`, [id]);
        const weights = await query(`SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 50`, [id]);
        
        res.json({
            meals: meals.rows,
            weights: weights.rows
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(
        `📡 Accepting requests from: ${process.env.FRONTEND_URL || "localhost"}`
    );
});
