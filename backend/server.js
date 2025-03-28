require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google-ai/generativelanguage');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());  // Enable Cross-Origin Resource Sharing (CORS)
app.use(express.json()); // Parse JSON request bodies

const MODEL_NAME = "gemini-1.0-pro"; // Or other available Gemini model
const API_KEY = process.env.GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getModel({ model: MODEL_NAME });

const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];


app.post('/api/rag', async (req, res) => {
    try {
        const { query, context } = req.body;

        // PROMPT ENGINEERING:  CRITICAL FOR RAG
        const promptText = `Answer the question below based on the context provided. If you don't know the answer or the context doesn't provide the answer, say "I don't know".
                             Question: ${query}
                             Context: ${context}`;

        const parts = [
          {text: promptText},
        ];

        const result = await model.generateContent({
          contents: [{ role: "user", parts }],
          generationConfig,
          safetySettings,
        });

        const response = result.response;

        if (response && response.text) {
            res.json({ response: response.text });
        } else {
            res.status(500).json({ error: "No response from the model." });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});