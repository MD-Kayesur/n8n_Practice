const chatService = require("./chat.service");

async function handleChat(req, res) {
    try {
        const { message, userId } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                success: false,
                error: "Message is required and must be a string"
            });
        }

        // Save incoming user message
        await chatService.saveMessage(userId, "user", message);

        // Process message through conversational router
        const reply = await chatService.generateReply(message, userId);

        // Save bot outgoing response
        await chatService.saveMessage(userId, "bot", reply);

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
}

async function handleHistory(req, res) {
    try {
        const { userId } = req.params;
        const history = await chatService.getHistory(userId);
        return res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error("❌ Error fetching history:", error.message);
        return res.status(500).json({ success: false, error: "Failed to load history" });
    }
}

module.exports = {
    handleChat,
    handleHistory
};
