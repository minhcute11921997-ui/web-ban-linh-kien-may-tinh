const express = require("express");
const chatbotController = require("../controllers/aiLabChatbotController");

const router = express.Router();

router.post("/message", chatbotController.chat);

module.exports = router;
