const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ================== ENV ==================
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ================== START LOG ==================
console.log("🔧 Bot Configuration");
console.log("PHONE_NUMBER_ID:", PHONE_NUMBER_ID);
console.log("WHATSAPP_TOKEN exists:", !!WHATSAPP_TOKEN);

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Bot is running");
});

// ================== WEBHOOK VERIFY (GET) ==================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📞 Webhook verification request");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ================== WEBHOOK RECEIVE (POST) ==================
app.post("/webhook", async (req, res) => {
  console.log("🔥 WEBHOOK HIT 🔥");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // No messages → ignore
    if (!value?.messages) {
      return res.sendStatus(200);
    }

    const message = value.messages[0];
    const from = value.contacts?.[0]?.wa_id; // ✅ CORRECT NUMBER
    const text = message.text?.body || "";

    console.log(`📩 Message from ${from}: "${text}"`);

    if (!from || !text) {
      return res.sendStatus(200);
    }

    await sendReply(from, text);

    res.sendStatus(200);
  } catch (err) {
    console.error(
      "❌ Webhook handler error:",
      err.response?.data || err.message,
    );
    res.sendStatus(500);
  }
});

// ================== SEND REPLY ==================
async function sendReply(to, receivedMsg) {
  let replyText = "";

  const msg = receivedMsg.toLowerCase();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    replyText = `👋 Hello Yash!

Welcome to your WhatsApp Bot 🤖

1️⃣ About
2️⃣ Support
3️⃣ Help`;
  } else if (msg === "1") {
    replyText = `📖 About

This WhatsApp bot is built using:
• Node.js
• Express
• Render
• WhatsApp Cloud API`;
  } else if (msg === "2") {
    replyText = `📞 Support

Email: support@example.com
Send *hi* to return to menu`;
  } else if (msg === "3") {
    replyText = `❓ Help

Type:
• hi
• 1
• 2
• 3`;
  } else {
    replyText = `🤖 You said: "${receivedMsg}"

Type *hi* to see menu.`;
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to, // ✅ VERIFIED USER NUMBER
        type: "text",
        text: {
          body: replyText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Message sent successfully");
  } catch (error) {
    console.error(
      "❌ Failed to send message:",
      error.response?.data || error.message,
    );
  }
}

// ================== START SERVER ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
