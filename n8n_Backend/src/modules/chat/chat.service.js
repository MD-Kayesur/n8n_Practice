const db = require("../../config/db");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Helper checks for active credentials
const hasGemini = () => !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
const hasClaude = () => !!((process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY.trim() !== "") || (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ""));
const hasGrok = () => !!((process.env.GROK_API_KEY && process.env.GROK_API_KEY.trim() !== "") || (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim() !== ""));

// Service database functions
function saveMessage(userId, role, text) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO messages (userId, role, text) VALUES (?, ?, ?)`,
            [userId || "anonymous", role, text],
            function (err) {
                if (err) {
                    console.error("❌ Error saving message:", err.message);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

function getHistory(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT role, text, timestamp FROM messages WHERE userId = ? ORDER BY timestamp ASC`,
            [userId],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(r => ({
                        role: r.role,
                        text: r.text,
                        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })));
                }
            }
        );
    });
}

// Service AI provider query functions
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

async function askN8N(message, userId) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("N8N_WEBHOOK_URL is not set");
    
    const response = await axios.post(webhookUrl, {
        message,
        userId: userId || "default_user"
    });
    
    if (response.data) {
        if (typeof response.data === "string") return response.data;
        if (response.data.reply) return response.data.reply;
        if (response.data.response) return response.data.response;
        if (response.data.text) return response.data.text;
        if (response.data.output) return response.data.output;
        return JSON.stringify(response.data);
    }
    throw new Error("n8n returned empty response");
}

// Core conversational AI generation orchestrator
async function generateReply(message, userId) {
    // 1. Try n8n Workflow first if N8N_WEBHOOK_URL is configured
    if (process.env.N8N_WEBHOOK_URL && process.env.N8N_WEBHOOK_URL.trim() !== "") {
        try {
            return await askN8N(message, userId);
        } catch (error) {
            console.error("❌ n8n Webhook Error, falling back to LLM/Rules:", error.message);
        }
    }

    // 2. Determine which provider to use
    let provider = (process.env.AI_PROVIDER || "").toLowerCase().trim();
    
    // Auto-detect provider if none is explicitly set
    if (!provider) {
        if (hasClaude()) {
            provider = "claude";
        } else if (hasGrok()) {
            provider = "grok";
        } else if (hasGemini()) {
            provider = "gemini";
        }
    }
    
    // 3. Query the selected provider
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

    // 4. Fallback to rule-based database
    const msg = message.toLowerCase().trim();
    
    const intents = [
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
        {
            keywords: ["thank", "thanks", "thank you", "shukriya", "dhonnobad"],
            responses: [
                "You're most welcome! 😊",
                "Happy to help! 🚀",
                "My pleasure!",
                "Anytime! Let me know if you need more help."
            ]
        },
        {
            keywords: ["bye", "goodbye", "see you", "take care", "later", "good night"],
            responses: [
                "Goodbye! Have a great day! 👋",
                "See you later! Stay awesome 🚀",
                "Take care! Come back anytime 😊",
                "Bye! I'm always here when you need me."
            ]
        },
        {
            keywords: ["what can you do", "your capabilities", "help me with", "what do you know", "features"],
            responses: [
                "I can help you with chatbots, web development, automation, and answer general questions 🚀",
                "I'm good at coding help, project ideas, and casual conversation 💻",
                "I can assist you in building AI systems, websites, and much more!"
            ]
        },
        {
            keywords: ["how are you", "how r u", "how r you"],
            responses: [
                "I'm doing great, thank you for asking! 🚀 How about you?",
                "I'm running at full power and ready to help! ⚡",
                "Fantastic! Thanks for checking on me 😊"
            ]
        },
        {
            keywords: ["joke", "tell me a joke", "make me laugh", "funny"],
            responses: [
                "Why do programmers prefer dark mode? Because light attracts bugs! 😆",
                "Why did the developer go broke? Because he used up all his cache! 😂",
                "I'm not lazy, I'm just in energy-saving mode like most developers! ⚡"
            ]
        },
        {
            keywords: ["who are you", "what are you", "tell me about yourself", "are you ai", "artificial intelligence"],
            responses: [
                "I am an AI assistant created by MD Kayesur to help with development and automation 🤖",
                "I'm a smart AI chatbot built to make your life easier 🚀",
                "I'm an intelligent assistant powered by logic and a lot of love from my creator!"
            ]
        }
    ];

    for (const intent of intents) {
        if (intent.keywords.some(keyword => msg.includes(keyword))) {
            const randomIndex = Math.floor(Math.random() * intent.responses.length);
            return intent.responses[randomIndex];
        }
    }

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

module.exports = {
    hasGemini,
    hasClaude,
    hasGrok,
    saveMessage,
    getHistory,
    generateReply
};
