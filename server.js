const express = require("express");
const cors = require("cors");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library"); // <--- NEW IMPORT
const db = require("./database");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = 3000;
// Setup Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // <--- NEW CONFIG

// ... (Keep your existing Middleware and Session setup exactly the same) ...
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.get("/api/config", (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
});

app.use(
    session({
        store: new SQLiteStore({ db: "sessions.db", dir: "." }),
        secret: "secret_key",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    })
);

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// --- AUTH ROUTES ---

app.get("/api/config", (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
});

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
        let user = await db.get(`SELECT * FROM users WHERE username = ?`, [
            googleEmail,
        ]);

        if (!user) {
            const result = await db.run(
                `INSERT INTO users (username, password, name, avatar) VALUES (?, ?, ?, ?)`,
                [googleEmail, "GOOGLE_LOGIN_ONLY", googleName, googlePicture]
            );
            user = { id: result.id };
        } else {
            await db.run(
                `UPDATE users SET name = ?, avatar = ? WHERE id = ?`,
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

        // Use our wrapper .run() method
        const result = await db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [username, hash]
        );

        // Auto Login
        req.session.userId = result.id;
        res.json({ success: true });
    } catch (err) {
        // SQLite error code 19 means "Unique Constraint Failed" (Username taken)
        if (err.errno === 19)
            return res.status(400).json({ error: "Username taken" });
        res.status(500).json({ error: "Server Error" });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.get(`SELECT * FROM users WHERE username = ?`, [
            username,
        ]);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        req.session.userId = user.id;
        res.json({ success: true });
    } catch (err) {
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
    const user = await db.get("SELECT username, name, avatar FROM users WHERE id = ?", [req.session.userId]);
    res.json({ loggedIn: true, user });
});

// --- APP ROUTES ---

app.get("/api/history", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });

    const meals = await db.all(
        `SELECT * FROM meals WHERE user_id = ? ORDER BY id DESC`,
        [req.session.userId]
    );
    res.json(meals);
});

// ... inside server.js ...

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

        // NOTE: We save data.short_title into 'food_name'
        await db.run(
            `INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, items, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.userId,
                data.short_title || "Scanned Meal", // <--- USE AI TITLE HERE
                data.total_calories,
                data.total_protein,
                data.total_carbs,
                data.total_fat,
                itemsJson,
                today,
            ]
        );

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
        await db.run(`DELETE FROM meals WHERE id = ? AND user_id = ?`, [
            mealId,
            req.session.userId,
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Could not delete" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
