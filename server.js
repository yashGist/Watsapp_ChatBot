const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log("Bot started");
console.log("Phone ID:", PHONE_NUMBER_ID);

// Health check
app.get("/", (req, res) => {
  res.send("Bot running");
});

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook handler
app.post("/webhook", async (req, res) => {
  console.log("=== WEBHOOK RECEIVED ===");

  // Send 200 immediately
  res.sendStatus(200);

  try {
    // Extract message
    const messages = req.body.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages || messages.length === 0) {
      console.log("No messages");
      return;
    }

    const message = messages[0];
    const from = message.from;
    const text = message.text?.body;
    const msgId = message.id;

    console.log("From:", from);
    console.log("Text:", text);
    console.log("ID:", msgId);

    if (!from || !text) {
      console.log("Missing data");
      return;
    }

    // Send reply
    await sendMessage(from, text);
  } catch (error) {
    console.error("Webhook error:", error.message);
  }
});

// Send message function
async function sendMessage(to, userMsg) {
  console.log("\n--- SENDING MESSAGE ---");
  console.log("To:", to);

  // Prepare reply
  let reply = "";
  const msg = userMsg.toLowerCase().trim();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    reply =
      "👋 Hello!\n\nWelcome to WhatsApp Bot\n\n1️⃣ About\n2️⃣ Support\n3️⃣ Help";
  } else if (msg === "1") {
    reply = "📖 About\n\nBuilt with Node.js + WhatsApp API";
  } else if (msg === "2") {
    reply = "📞 Support\n\nEmail: support@example.com";
  } else if (msg === "3") {
    reply = "❓ Help\n\nType: hi, 1, 2, 3";
  } else {
    reply = `You said: "${userMsg}"\n\nType *hi* for menu`;
  }

  console.log("Reply:", reply);

  const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: reply },
      },
    });

    console.log("✅ SUCCESS");
    console.log("Response:", JSON.stringify(response.data));
  } catch (error) {
    console.error("\n❌ SEND FAILED");
    console.error("Status:", error.response?.status);
    console.error("Error:", JSON.stringify(error.response?.data, null, 2));

    // Print specific error details
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.error("\n🔴 ERROR DETAILS:");
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      console.error("Type:", err.type);

      // Specific fixes
      if (err.code === 131031) {
        console.error(
          "\n💡 FIX: Add +91 91111 27569 to test recipients in Meta dashboard",
        );
        console.error("Go to: WhatsApp > API Setup > Step 3");
      } else if (err.code === 190) {
        console.error(
          "\n💡 FIX: Token expired - generate new token in Meta dashboard",
        );
      } else if (err.code === 100) {
        console.error("\n💡 FIX: Token missing permissions");
      } else if (err.code === 33) {
        console.error("\n💡 FIX: Phone number not valid");
      }
    }
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
