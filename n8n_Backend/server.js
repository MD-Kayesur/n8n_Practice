require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
    res.json({
        status: "Success",
        message: "n8n AI Backend Running 🚀"
    });
});


// MAIN CHAT ROUTE (used by n8n or Telegram)
app.post("/chat", async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        // Simple AI logic (you can upgrade later)
        const reply = await generateReply(message);

        return res.json({
            success: true,
            reply,
            userId: userId || null
        });

    } catch (error) {
        console.error("Chat Error:", error.message);

        return res.status(500).json({
            success: false,
            reply: "Server error. Try again later."
        });
    }
});


// ===============================
// AI LOGIC FUNCTION
// ===============================
async function generateReply(message) {

    const msg = message.toLowerCase();

    // 1. Simple keyword routing (your current style)
    if (msg.includes("who are you")) {
        return "I am an AI assistant built by MD Kayesur 🚀";
    }

    if (msg.includes("creator")) {
        return "My creator is MD Kayesur. He is a Full-Stack Developer 💻";
    }

    if (msg.includes("hello") || msg.includes("hi")) {
        return "Hello 👋 How can I help you today?";
    }

    if (msg.includes("project")) {
        return "I can help you build AI bots, websites, and automation systems 🚀";
    }

    // 2. Default response (AI fallback style)
    return `I understood: "${message}". I am still learning 🚀`;
}


// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});