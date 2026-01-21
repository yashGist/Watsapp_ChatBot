app.post("/webhook", (req, res) => {
  console.log("🔥🔥 WEBHOOK HIT 🔥🔥");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  res.status(200).send("OK");
});

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ENV
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Debug
console.log("🔧 Bot Configuration:");
console.log("PHONE_NUMBER_ID:", PHONE_NUMBER_ID);
console.log("TOKEN exists:", !!WHATSAPP_TOKEN);

/* ----------------------------------
   WEBHOOK VERIFICATION (GET)
----------------------------------- */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📞 Webhook verification attempt");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

/* ----------------------------------
   RECEIVE MESSAGES (POST)
----------------------------------- */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log(`📩 Message from ${from}: "${text}"`);

    // 🚫 Prevent replying to own messages
    const myPhoneId = value.metadata?.phone_number_id;
    if (from === myPhoneId) {
      return res.sendStatus(200);
    }

    await sendReply(from, text);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(500);
  }
});

/* ----------------------------------
   SEND MESSAGE FUNCTION
----------------------------------- */
async function sendReply(to, receivedMsg) {
  const msg = receivedMsg.toLowerCase();
  let replyText = "";

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    replyText = `👋 Hello! Welcome to MyBot!

How can I help you today?

1️⃣ About Us
2️⃣ Contact Support
3️⃣ Help`;
  } else if (msg === "1" || msg.includes("about")) {
    replyText = `📖 About Us

We are a demo WhatsApp bot built using Node.js, Express, Render, and WhatsApp Cloud API.

Send *hi* to see the menu again.`;
  } else if (msg === "2" || msg.includes("support")) {
    replyText = `📞 Contact Support

Email: support@example.com
Phone: +1234567890

Send *hi* for menu.`;
  } else if (msg === "3" || msg.includes("help")) {
    replyText = `❓ Help Menu

• hi → Main menu
• 1 → About us
• 2 → Support
• 3 → Help

Try it now 🙂`;
  } else {
    replyText = `🤖 I received: "${receivedMsg}"

Send *hi* to see available options.`;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text", // ✅ REQUIRED
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

    console.log("✅ Reply sent");
  } catch (error) {
    console.error(
      "❌ Send message failed:",
      error.response?.data || error.message,
    );
  }
}

/* ----------------------------------
   HEALTH CHECK
----------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Bot is running");
});

/* ----------------------------------
   START SERVER
----------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
