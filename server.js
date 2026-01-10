const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const db = require("./database");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
// Setup Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
// Serve built frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
});

app.use(
    session({
        store: new pgSession({
            pool: db.pool, // Access the underlying pool from database.js
            tableName: "session",
            createTableIfMissing: true,
        }),
        secret: process.env.SESSION_SECRET || "supersecretkey123",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        },
    })
);

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- AUTH ROUTES ---

app.post("/api/auth/google", async (req, res) => {
    const { token } = req.body;

    try {
        // A. Verify the token with Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Google gives us these details securely:
        const googleEmail = payload.email;
        const googleName = payload.name;
        const googlePicture = payload.picture;

        // B. Check if user exists in OUR database
        const userRes = await db.query(
            `SELECT * FROM users WHERE username = $1`,
            [googleEmail]
        );
        let user = userRes.rows[0];

        if (!user) {
            const result = await db.query(
                `INSERT INTO users (username, password, name, avatar) VALUES ($1, $2, $3, $4) RETURNING *`,
                [googleEmail, "GOOGLE_LOGIN_ONLY", googleName, googlePicture]
            );
            user = result.rows[0];
        } else {
            // Update name/avatar
            await db.query(
                `UPDATE users SET name = $1, avatar = $2 WHERE id = $3`,
                [googleName, googlePicture, user.id]
            );
        }

        // D. Create Session (Log them in)
        req.session.userId = user.id;
        res.json({ success: true, username: googleEmail });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ error: "Invalid Google Token" });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "Missing fields" });

        const hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`,
            [username, hash]
        );

        // Auto Login
        req.session.userId = result.rows[0].id;
        res.json({ success: true });
    } catch (err) {
        // Postgres unique violation code is 23505
        if (err.code === "23505")
            return res.status(400).json({ error: "Username taken" });
        res.status(500).json({ error: "Server Error" });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const userRes = await db.query(
            `SELECT * FROM users WHERE username = $1`,
            [username]
        );
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

// Logout
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get User Status
app.get("/api/me", async (req, res) => {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const result = await db.query("SELECT * FROM users WHERE id = $1", [
        req.session.userId,
    ]);
    res.json({ loggedIn: true, user: result.rows[0] });
});

// --- APP ROUTES ---

app.get("/api/history", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const result = await db.query(
        `SELECT * FROM meals WHERE user_id = $1 ORDER BY id DESC`,
        [req.session.userId]
    );
    res.json(result.rows);
});


app.post("/api/analyze", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    try {
        const { food, image } = req.body;

        // UPDATED PROMPT: We ask for 'short_title'
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

        const inputParts = [prompt];
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

        // SAVE TO DB
        const today = new Date().toISOString().split("T")[0];
        const itemsJson = JSON.stringify(data.items);
        const mealType = req.body.meal_type || "Snack"; // Capture meal_type from request

        // NOTE: We save data.short_title into 'food_name'
        await db.query(
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

        // Pass meal_type back so frontend can update immediately if needed
        data.meal_type = mealType;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI Error" });
    }
});

app.delete("/api/history/:id", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const mealId = req.params.id;

    try {
        // We ensure the meal belongs to the logged-in user before deleting
        await db.query(`DELETE FROM meals WHERE id = $1 AND user_id = $2`, [
            mealId,
            req.session.userId,
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Could not delete" });
    }
});

// --- WEIGHT ROUTES ---
app.get("/api/weight", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const result = await db.query(
            "SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY date DESC",
            [req.session.userId]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/weight", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    const { weight, date } = req.body;
    try {
        await db.query(
            "INSERT INTO weight_logs (user_id, weight, date) VALUES ($1, $2, $3)",
            [req.session.userId, weight, date]
        );
        await db.query("UPDATE users SET weight = $1 WHERE id = $2", [
            weight,
            req.session.userId,
        ]);

        // Update session
        if (req.session.user) req.session.user.weight = weight;

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ONBOARDING ROUTE ---

app.post("/api/user/onboarding", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    const { height, weight, age, gender, activity_level, goal, tdee } =
        req.body;

    try {
        await db.query(
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
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
