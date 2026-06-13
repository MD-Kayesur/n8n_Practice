const axios = require("axios");

async function sendWhatsAppMessage(to, text) {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!apiKey || !phoneId) {
        console.error("⚠️ WhatsApp credentials missing. Can't send message.");
        return;
    }
    
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${phoneId}/messages`,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: to,
                type: "text",
                text: { preview_url: false, body: text }
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`✉️ Message sent successfully to WhatsApp user: ${to}`);
    } catch (error) {
        console.error("❌ WhatsApp Outbound Send Error:", error.response ? error.response.data : error.message);
    }
}

module.exports = {
    sendWhatsAppMessage
};
