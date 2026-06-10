require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Log available providers on startup
const activeProviders = [];
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") activeProviders.push("gemini");
if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) activeProviders.push("claude");
if (process.env.GROK_API_KEY || process.env.XAI_API_KEY) activeProviders.push("grok");

console.log(`🤖 Available AI Providers: [${activeProviders.length > 0 ? activeProviders.join(", ") : "none (rule-based fallback only)"}]`);

// =======================
// PROVIDER UTILITIES
// =======================

async function askGemini(message) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    if (!text || text.trim() === "") throw new Error("Gemini returned empty response");
    return text;
}

async function askClaude(message) {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("CLAUDE_API_KEY or ANTHROPIC_API_KEY is not set");
    
    const modelName = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
    
    const response = await axios.post("https://api.anthropic.com/v1/messages", {
        model: modelName,
        max_tokens: 1024,
        messages: [{ role: "user", content: message }]
    }, {
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
    });
    
    if (response.data && response.data.content && response.data.content[0]) {
        return response.data.content[0].text;
    }
    throw new Error("Claude returned invalid response structure");
}

async function askGrok(message) {
    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("GROK_API_KEY or XAI_API_KEY is not set");
    
    const modelName = process.env.GROK_MODEL || "grok-beta";
    
    const response = await axios.post("https://api.x.ai/v1/chat/completions", {
        model: modelName,
        messages: [{ role: "user", content: message }]
    }, {
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        }
    });
    
    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        return response.data.choices[0].message.content;
    }
    throw new Error("Grok returned invalid response structure");
}

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

// =======================
// Health Check Route
// =======================
app.get("/", (req, res) => {
    res.json({
        status: "Success",
        message: "n8n AI Backend Running 🚀"
    });
});

// =======================
// MAIN CHAT ROUTE
// =======================
app.post("/chat", async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                success: false,
                error: "Message is required and must be a string"
            });
        }

        const reply = await generateReply(message);

        return res.json({
            success: true,
            reply,
            userId: userId || null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Chat Error:", error.message);
        return res.status(500).json({
            success: false,
            reply: "Sorry, I'm having trouble responding right now. Please try again later."
        });
    }
});

// =======================
// ADVANCED AI LOGIC FUNCTION
// =======================
async function generateReply(message) {
    // 1. Determine which provider to use
    let provider = (process.env.AI_PROVIDER || "").toLowerCase().trim();
    
    // Auto-detect provider if none is explicitly set
    if (!provider) {
        if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) {
            provider = "claude";
        } else if (process.env.GROK_API_KEY || process.env.XAI_API_KEY) {
            provider = "grok";
        } else if (process.env.GEMINI_API_KEY) {
            provider = "gemini";
        }
    }
    
    // 2. Query the selected provider
    if (provider === "claude") {
        try {
            return await askClaude(message);
        } catch (error) {
            console.error("❌ Claude API Error, falling back:", error.message);
        }
    } else if (provider === "grok") {
        try {
            return await askGrok(message);
        } catch (error) {
            console.error("❌ Grok API Error, falling back:", error.message);
        }
    } else if (provider === "gemini") {
        try {
            return await askGemini(message);
        } catch (error) {
            console.error("❌ Gemini API Error, falling back:", error.message);
        }
    } else if (provider) {
        console.warn(`⚠️ Configured provider "${provider}" has no credentials or is invalid. falling back to local database.`);
    }

    const msg = message.toLowerCase().trim();

    // =======================
    // INTENTS DATABASE (Greatly Expanded)
    // =======================
    const intents = [

        // 1. GREETINGS
        {
            keywords: ["hi", "hello", "hey", "how are you", "good morning", "good evening", "good night", "assalamu alaikum", "salam", "yo", "what's up", "sup", "hola", "hey there", "hi bot", "hello bot", "are you there", "wassup", "greetings", "nice to meet you", "morning", "evening", "night"],
            responses: [
                "Hello 👋 How can I help you today?",
                "Hey there 🚀 Nice to meet you!",
                "Hi 😊 What can I do for you?",
                "Hello 💻 Ready to help!",
                "Hey 👋 Hope you're having a great day!",
                "Assalamu Alaikum! How can I assist you today? 😊",
                "Greetings friend! What are we building today? ⚡"
            ]
        },

        // 2. CREATOR / DEVELOPER
        {
            keywords: ["creator", "who made you", "who built you", "your developer", "who created you", "developer", "owner", "who owns you", "your owner", "your maker", "kayesur", "md kayesur", "kayesur rahman"],
            responses: [
                "My creator is MD Kayesur 🚀",
                "I was developed by MD Kayesur 💻",
                "MD Kayesur created me 🤖",
                "I'm built by a talented Full-Stack Developer named MD Kayesur ⚡",
                "MD Kayesur is my developer and owner. He loves building AI and automation systems!"
            ]
        },

        // 3. PROJECTS & SERVICES
        {
            keywords: ["project", "projects", "website", "chatbot", "ai bot", "automation", "portfolio", "fullstack", "react", "nextjs", "express", "mongodb", "nodejs", "frontend", "backend", "api", "software", "application", "web app", "mobile app", "telegram bot", "n8n", "workflow"],
            responses: [
                "I can help you build AI bots, websites, and automation systems 🚀",
                "I specialize in full-stack web development with React, Next.js, Node.js, and MongoDB 💻",
                "I can create intelligent chatbots and powerful automation workflows ⚡",
                "I have strong experience in building modern web applications and APIs",
                "Would you like help with a new project? I can assist from idea to deployment!"
            ]
        },

        // 4. THANK YOU
        {
            keywords: ["thank", "thanks", "thank you", "shukriya", "dhonnobad"],
            responses: [
                "You're most welcome! 😊",
                "Happy to help! 🚀",
                "My pleasure!",
                "Anytime! Let me know if you need more help."
            ]
        },

        // 5. GOODBYE
        {
            keywords: ["bye", "goodbye", "see you", "take care", "later", "good night"],
            responses: [
                "Goodbye! Have a great day! 👋",
                "See you later! Stay awesome 🚀",
                "Take care! Come back anytime 😊",
                "Bye! I'm always here when you need me."
            ]
        },

        // 6. WHAT CAN YOU DO / CAPABILITIES
        {
            keywords: ["what can you do", "your capabilities", "help me with", "what do you know", "features"],
            responses: [
                "I can help you with chatbots, web development, automation, and answer general questions 🚀",
                "I'm good at coding help, project ideas, and casual conversation 💻",
                "I can assist you in building AI systems, websites, and much more!"
            ]
        },

        // 7. HOW ARE YOU
        {
            keywords: ["how are you", "how r u", "how r you"],
            responses: [
                "I'm doing great, thank you for asking! 🚀 How about you?",
                "I'm running at full power and ready to help! ⚡",
                "Fantastic! Thanks for checking on me 😊"
            ]
        },

        // 8. JOKES
        {
            keywords: ["joke", "tell me a joke", "make me laugh", "funny"],
            responses: [
                "Why do programmers prefer dark mode? Because light attracts bugs! 😆",
                "Why did the developer go broke? Because he used up all his cache! 😂",
                "I'm not lazy, I'm just in energy-saving mode like most developers! ⚡"
            ]
        },

        // 9. ABOUT AI
        {
            keywords: ["who are you", "what are you", "tell me about yourself", "are you ai", "artificial intelligence"],
            responses: [
                "I am an AI assistant created by MD Kayesur to help with development and automation 🤖",
                "I'm a smart AI chatbot built to make your life easier 🚀",
                "I'm an intelligent assistant powered by logic and a lot of love from my creator!"
            ]
        },

        // 10. DEFAULT / FALLBACK
        // (This will be used if no intent matches)
    ];

    // Match intent
    for (const intent of intents) {
        if (intent.keywords.some(keyword => msg.includes(keyword))) {
            const randomIndex = Math.floor(Math.random() * intent.responses.length);
            return intent.responses[randomIndex];
        }
    }

    // =======================
    // DEFAULT FALLBACK RESPONSES (Very Natural)
    // =======================
    const defaultResponses = [
        `I understood: "${message}". That's interesting! How can I help you more? 🚀`,
        "Thanks for your message! I'm still learning but I'm getting better every day. What would you like to know? 😊",
        "Got it! I'm here to help with development, automation, or just chat. Tell me more! 💻",
        "Interesting point! How else can I assist you today?",
        "I'm not 100% sure about that yet, but I'm happy to help with coding, projects, or ideas! What do you need?"
    ];

    const randomDefault = Math.floor(Math.random() * defaultResponses.length);
    return defaultResponses[randomDefault];
}

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
});