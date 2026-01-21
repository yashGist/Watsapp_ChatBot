const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log("🔧 Bot Configuration:");
console.log("PHONE_NUMBER_ID:", PHONE_NUMBER_ID);
console.log("TOKEN exists:", !!WHATSAPP_TOKEN);

// Webhook verification (Meta will call this)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📞 Webhook verification attempt");
  console.log("Mode:", mode, "| Token match:", token === VERIFY_TOKEN);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verification failed");
    res.status(403).send("Forbidden");
  }
});

// Receive messages from WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📨 Webhook received:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from;
        const msgBody = message.text?.body || "";

        console.log(`📩 Message from ${from}: "${msgBody}"`);

        // Send reply
        await sendReply(from, msgBody);
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Error");
  }
});

// Function to send reply
async function sendReply(to, receivedMsg) {
  let replyText = "";
  const msg = receivedMsg.toLowerCase();

  // Bot logic
  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    replyText = `👋 Hello! Welcome to MyBot!

How can I help you today?

1️⃣ About Us
2️⃣ Contact Support
3️⃣ Help`;
  } else if (msg.includes("1") || msg.includes("about")) {
    replyText =
      '📖 About Us:\n\nWe are a demo WhatsApp bot built with Node.js and Express! This bot is hosted on Render and uses WhatsApp Business Cloud API.\n\nSend "hi" to see the menu.';
  } else if (
    msg.includes("2") ||
    msg.includes("support") ||
    msg.includes("contact")
  ) {
    replyText =
      '📞 Contact Support:\n\nEmail: support@example.com\nPhone: +1234567890\n\nWe are here to help 24/7! 🤝\n\nSend "hi" for menu.';
  } else if (msg.includes("3") || msg.includes("help")) {
    replyText =
      '❓ Help:\n\n• Send "hi" - Main menu\n• Send "1" - About us\n• Send "2" - Contact support\n\nWhat else can I help with?';
  } else {
    replyText = `I received: "${receivedMsg}"

Send "hi" to see available options! 🤖`;
  }

  // Send via WhatsApp API
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        text: { body: replyText },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("✅ Reply sent!");
  } catch (error) {
    console.error("❌ Send error:", error.response?.data || error.message);
  }
}

// Health check endpoint
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Bot</title>
      <style>
        body { font-family: Arial; padding: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
        h1 { color: #25D366; }
        .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ WhatsApp Bot is Running!</h1>
        <div class="status">
          <strong>Status:</strong> Online and ready
        </div>
        <p class="info">Phone Number ID: ${PHONE_NUMBER_ID}</p>
        <p class="info">Server is active and listening for WhatsApp messages.</p>
      </div>
    </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server started successfully!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}\n`);
});
