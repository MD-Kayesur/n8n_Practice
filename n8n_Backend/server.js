require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const chatService = require("./src/modules/chat/chat.service");

const app = express();

// =======================
// Global Middlewares
// =======================
app.use(cors());
app.use(express.json());

// Log available providers on startup
const activeProviders = [];
if (chatService.hasGemini()) activeProviders.push("gemini");
if (chatService.hasClaude()) activeProviders.push("claude");
if (chatService.hasGrok()) activeProviders.push("grok");

const n8nConfigured = !!(process.env.N8N_WEBHOOK_URL && process.env.N8N_WEBHOOK_URL.trim() !== "");

console.log(`🤖 Available AI Providers: [${activeProviders.length > 0 ? activeProviders.join(", ") : "none (rule-based fallback only)"}]`);
console.log(`🔌 n8n Workflow Integration: [${n8nConfigured ? "ENABLED" : "DISABLED"}]`);

// Register combined router
app.use("/", routes);

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
});