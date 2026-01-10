import { GoogleGenerativeAI } from "@google/generative-ai";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import { OAuth2Client } from "google-auth-library";
import path from "path";
import { pool, query } from "./database"; // Updated import

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

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve built frontend files from public folder
// Note: adjusting path to go up one level since we are in src/
app.use(express.static(path.join(__dirname, "../public")));

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
            sameSite: "lax",
            httpOnly: true,
        },
    })
);

// Initialize Gemini AI
const apiKey = process.env.API_KEY || "";
if (!apiKey) console.warn("API_KEY for Gemini is missing");
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

        const prompt = `
        Analyze this. Return JSON:
        {
            "short_title": "A concise 3-5 word name for this meal (e.g. 'Jollibee Burger Meal')",
            "items": [{"name": "str", "calories": int, "protein": "str", "carbs": "str", "fat": "str"}],
            "total_calories": int,
            "total_protein": "str",
            "total_carbs": "str",
            "total_fat": "str",
            "summary": "str"
        }`;

        const inputParts: any[] = [prompt];
        if (food) inputParts.push(food);
        if (image)
            inputParts.push({
                inlineData: { data: image, mimeType: "image/jpeg" },
            });

        const result = await model.generateContent(inputParts);
        const text = result.response
            .text()
            .replace(/```json|```/g, "")
            .trim();
        const data = JSON.parse(text);

        const today = new Date().toISOString().split("T")[0];
        const itemsJson = JSON.stringify(data.items);
        const mealType = req.body.meal_type || "Snack";

        await query(
            `INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, items, date, meal_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                req.session.userId,
                data.short_title || "Scanned Meal",
                data.total_calories,
                data.total_protein,
                data.total_carbs,
                data.total_fat,
                itemsJson,
                today,
                mealType,
            ]
        );

        data.meal_type = mealType;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI Error" });
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
