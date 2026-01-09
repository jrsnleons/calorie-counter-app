const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());


app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" }
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { food, image } = req.body;

        if (!food && !image) {
            return res.status(400).json({ error: "Please provide text or an image" });
        }

        const prompt = `
        Analyze this meal.
        Return a JSON object with this EXACT structure:
        {
            "items": [
                {
                    "name": "Item name",
                    "calories": 0,
                    "protein": "0g",
                    "carbs": "0g",
                    "fat": "0g"
                }
            ],
            "total_calories": 0,
            "total_protein": "0g",
            "total_carbs": "0g",
            "total_fat": "0g",
            "summary": "Short health comment"
        }
        `;

        // --- CHANGE 2: PREPARE DATA FOR GEMINI ---
        const inputParts = [prompt];

        // If user sent text, add it
        if (food) inputParts.push(food);

        // If user sent an image, format it for Gemini
        if (image) {
            inputParts.push({
                inlineData: {
                    data: image,       // The Base64 string
                    mimeType: "image/jpeg" // We assume JPEG/PNG
                }
            });
        }

        // Send the array [prompt, text, image] to the AI
        const result = await model.generateContent(inputParts);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json|```/g, '').trim();
        const jsonResponse = JSON.parse(cleanText);

        res.json(jsonResponse);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI Error: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
