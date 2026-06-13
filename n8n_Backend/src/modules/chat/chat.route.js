const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");

router.post("/chat", chatController.handleChat);
router.get("/history/:userId", chatController.handleHistory);

module.exports = router;
