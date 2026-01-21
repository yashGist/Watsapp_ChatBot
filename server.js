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
      console.log("⚠️ No messages in webhook payload");
      return res.sendStatus(200);
    }

    const message = value.messages[0];
    const from = message.from; // ✅ USE message.from directly
    const text = message.text?.body || "";
    const messageId = message.id;

    console.log(`📩 Message from ${from}: "${text}" [ID: ${messageId}]`);

    if (!from || !text) {
      console.log("⚠️ Missing from or text");
      return res.sendStatus(200);
    }

    // Send reply asynchronously
    sendReply(from, text).catch((err) => {
      console.error("❌ Error in sendReply:", err.message);
    });

    // Respond immediately to Facebook
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

  const msg = receivedMsg.toLowerCase().trim();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    replyText = `👋 Hello!

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

  const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      preview_url: false,
      body: replyText,
    },
  };

  console.log("📤 Sending to:", url);
  console.log("📦 Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Message sent successfully");
    console.log("📬 Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Failed to send message");
    console.error("Status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Error message:", error.message);

    // Log the full error for debugging
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.error(
        `🔴 WhatsApp API Error: ${err.message} (Code: ${err.code})`,
      );
      console.error(`🔴 Error Type: ${err.type}`);
      console.error(`🔴 Error Subcode: ${err.error_subcode}`);
      console.error(`🔴 Trace ID: ${err.fbtrace_id}`);
    }
  }
}

// ================== START SERVER ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
