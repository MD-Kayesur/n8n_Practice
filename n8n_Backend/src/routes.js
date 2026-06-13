const express = require("express");
const router = express.Router();

const chatRoute = require("./modules/chat/chat.route");
const webhookRoute = require("./modules/webhook/webhook.route");

// Health check route
router.get("/", (req, res) => {
    res.json({
        status: "Success",
        message: "n8n AI Backend Running 🚀"
    });
});

// Register modular route subgroups
router.use(chatRoute);
router.use(webhookRoute);

module.exports = router;
