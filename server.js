const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ====================================
// CONFIGURATION
// ====================================
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 10000;
const RENDER_URL = "https://watsapp-chatbot-ohkb.onrender.com";

console.log("=".repeat(50));
console.log("BOT STARTED");
console.log("=".repeat(50));
console.log(
  "VERIFY_TOKEN:",
  VERIFY_TOKEN ? `✅ "${VERIFY_TOKEN}"` : "❌ MISSING",
);
console.log("WHATSAPP_TOKEN:", WHATSAPP_TOKEN ? "✅ SET" : "❌ MISSING");
console.log(
  "PHONE_NUMBER_ID:",
  PHONE_NUMBER_ID ? `✅ "${PHONE_NUMBER_ID}"` : "❌ MISSING",
);
console.log("=".repeat(50));

// ====================================
// KEEP-ALIVE
// ====================================
setInterval(async () => {
  try {
    await axios.get(RENDER_URL);
    console.log("⏰ Keep-alive ping");
  } catch (error) {
    console.log("⏰ Keep-alive failed:", error.message);
  }
}, 30 * 1000);

// ====================================
// MIDDLEWARE
// ====================================
app.use((req, res, next) => {
  console.log(`\n🔔 ${req.method} ${req.path}`);
  if (req.method === "POST") {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  if (req.method === "GET" && req.path === "/webhook") {
    console.log("Query:", req.query);
  }
  next();
});

// ====================================
// ROUTES
// ====================================

// Health check
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Bot is RUNNING!");
});

// Webhook verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("\n📞 WEBHOOK VERIFICATION");
  console.log("Mode:", mode);
  console.log("Token received:", token);
  console.log("Token expected:", VERIFY_TOKEN);
  console.log("Match?", token === VERIFY_TOKEN);
  console.log("Challenge:", challenge);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅✅✅ VERIFICATION SUCCESS ✅✅✅\n");
    return res.status(200).send(challenge);
  } else {
    console.log("❌❌❌ VERIFICATION FAILED ❌❌❌");
    console.log(
      "Reason:",
      !mode ? "No mode" : !token ? "No token" : "Token mismatch",
    );
    return res.sendStatus(403);
  }
});

// Webhook messages (POST)
app.post("/webhook", async (req, res) => {
  console.log("\n" + "🔥".repeat(25));
  console.log("WEBHOOK MESSAGE RECEIVED");
  console.log("🔥".repeat(25));

  // Send 200 immediately
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      console.log("⚠️ No messages in webhook");
      return;
    }

    const message = messages[0];
    const from = message.from;
    const text = message.text?.body;

    console.log("📱 From:", from);
    console.log("💬 Text:", text);

    if (!from || !text) {
      console.log("❌ Missing from or text");
      return;
    }

    // Send reply
    await sendMessage(from, text);
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
  }
});

// ====================================
// SEND MESSAGE FUNCTION
// ====================================
async function sendMessage(to, userMsg) {
  console.log("\n📤 SENDING REPLY TO:", to);

  let reply = "";
  const msg = userMsg.toLowerCase().trim();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    reply =
      "👋 Hello!\n\nWelcome to WhatsApp Bot 🤖\n\n1️⃣ About\n2️⃣ Support\n3️⃣ Help";
  } else if (msg === "1") {
    reply = "📖 About\n\nBuilt with Node.js + WhatsApp Cloud API";
  } else if (msg === "2") {
    reply = "📞 Support\n\nEmail: support@example.com\nType *hi* for menu";
  } else if (msg === "3") {
    reply = "❓ Help\n\nType: hi, 1, 2, 3";
  } else {
    reply = `🤖 You said: "${userMsg}"\n\nType *hi* for menu`;
  }

  const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: reply },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ MESSAGE SENT!");
    console.log("Response:", response.data);
  } catch (error) {
    console.error("❌ SEND FAILED");
    console.error("Error:", error.response?.data || error.message);
  }
}
// ====================================
// START SERVER
// ====================================
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Webhook: ${RENDER_URL}/webhook\n`);
});
