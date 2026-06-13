const webhookService = require("./webhook.service");
const chatService = require("../chat/chat.service");

function verifyWebhook(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (mode === "subscribe" && token === verifyToken) {
        console.log("✅ WhatsApp Webhook verified successfully!");
        res.status(200).send(challenge);
    } else {
        console.warn("⚠️ Webhook verification failed.");
        res.sendStatus(403);
    }
}

async function handleWebhook(req, res) {
    try {
        const { body } = req;
        
        if (body.object === "whatsapp_business_account") {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const messageObj = value?.messages?.[0];
            
            if (messageObj && messageObj.type === "text") {
                const fromPhoneNumber = messageObj.from;
                const messageText = messageObj.text.body;
                
                console.log(`📥 Received WhatsApp message from ${fromPhoneNumber}: "${messageText}"`);
                
                // Save incoming message
                await chatService.saveMessage(fromPhoneNumber, "user", messageText);
                
                // Generate reply
                const reply = await chatService.generateReply(messageText, fromPhoneNumber);
                
                // Save outgoing reply
                await chatService.saveMessage(fromPhoneNumber, "bot", reply);
                
                // Send reply to WhatsApp Cloud API
                await webhookService.sendWhatsAppMessage(fromPhoneNumber, reply);
            }
            
            return res.sendStatus(200);
        }
        
        res.sendStatus(404);
    } catch (error) {
        console.error("❌ WhatsApp Webhook Processing Error:", error.message);
        res.sendStatus(500);
    }
}

module.exports = {
    verifyWebhook,
    handleWebhook
};
