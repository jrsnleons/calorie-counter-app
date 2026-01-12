import { GoogleGenerativeAI } from "@google/generative-ai";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import { OAuth2Client } from "google-auth-library";
import path from "path";
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
    "http://localhost:5173",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);
            if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, "")))) {
                callback(null, true);
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

app.post("/api/register", async (req: Request, res: Response): Promise<any> => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });

        const hash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`,
            [username, hash]
        );

        req.session.userId = result.rows[0].id;
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === "23505")
            return res.status(400).json({ error: "Username taken" });
        res.status(500).json({ error: "Server Error" });
    }
});

app.post("/api/login", async (req: Request, res: Response): Promise<any> => {
    try {
        const { username, password } = req.body;
        const userRes = await query(`SELECT * FROM users WHERE username = $1`, [
            username,
        ]);
        const user = userRes.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        req.session.userId = user.id;
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

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
        await query(
            "INSERT INTO weight_logs (user_id, weight, date) VALUES ($1, $2, $3)",
            [req.session.userId, weight, date]
        );
        await query("UPDATE users SET weight = $1 WHERE id = $2", [
            weight,
            req.session.userId,
        ]);

        if (req.session.user) req.session.user.weight = weight;

        res.json({ success: true });
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
app.put("/api/user", async (req: Request, res: Response): Promise<any> => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const { name, height, weight, age, gender, activity_level } = req.body;

    try {
        // Calculate TDEE using Mifflin-St Jeor Equation
        let bmr = 0;
        if (gender === "Male") {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        let multiplier = 1.2; // Sedentary
        switch (activity_level) {
            case "Light":
                multiplier = 1.375;
                break;
            case "Moderate":
                multiplier = 1.55;
                break;
            case "Active":
                multiplier = 1.725;
                break;
            case "Very Active":
                multiplier = 1.9;
                break;
        }

        const tdee = Math.round(bmr * multiplier);

        await query(
            `UPDATE users SET name=$1, height=$2, weight=$3, age=$4, gender=$5, activity_level=$6, tdee=$7 WHERE id=$8`,
            [
                name,
                height,
                weight,
                age,
                gender,
                activity_level,
                tdee,
                req.session.userId,
            ]
        );

        res.json({ success: true, tdee });
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
                    cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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

app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Accepting requests from: ${process.env.FRONTEND_URL || "localhost"}`);
});
