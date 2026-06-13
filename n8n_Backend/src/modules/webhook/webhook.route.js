const express = require("express");
const router = express.Router();
const webhookController = require("./webhook.controller");

router.get("/webhook", webhookController.verifyWebhook);
router.post("/webhook", webhookController.handleWebhook);

module.exports = router;
