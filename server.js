const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Read from process.env directly (Render sets these)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log("=".repeat(50));
console.log("BOT STARTED");
console.log("=".repeat(50));
console.log("VERIFY_TOKEN:", VERIFY_TOKEN ? "✅ SET" : "❌ MISSING");
console.log("WHATSAPP_TOKEN:", WHATSAPP_TOKEN ? "✅ SET" : "❌ MISSING");
console.log("PHONE_NUMBER_ID:", PHONE_NUMBER_ID ? "✅ SET" : "❌ MISSING");
console.log("Token length:", WHATSAPP_TOKEN?.length);
console.log("Token preview:", WHATSAPP_TOKEN?.substring(0, 30) + "...");
console.log("=".repeat(50));

// Health check
app.get("/", (req, res) => {
  res.send("✅ Bot is running");
});

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📞 Webhook verification attempt");
  console.log("Mode:", mode);
  console.log("Token match:", token === VERIFY_TOKEN);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verification failed");
    res.sendStatus(403);
  }
});

// Webhook handler
app.post("/webhook", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("🔥 WEBHOOK RECEIVED");
  console.log("=".repeat(50));

  // Send 200 immediately
  res.sendStatus(200);

  try {
    // Extract message
    const messages = req.body.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages || messages.length === 0) {
      console.log("⚠️ No messages in webhook");
      return;
    }

    const message = messages[0];
    const from = message.from;
    const text = message.text?.body;
    const msgId = message.id;

    console.log("From:", from);
    console.log("Text:", text);
    console.log("Message ID:", msgId);

    if (!from || !text) {
      console.log("❌ Missing from or text");
      return;
    }

    // Send reply
    await sendMessage(from, text);
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    console.error(error.stack);
  }
});

// Send message function
async function sendMessage(to, userMsg) {
  console.log("\n" + "-".repeat(50));
  console.log("📤 SENDING REPLY");
  console.log("-".repeat(50));
  console.log("To:", to);
  console.log("User message:", userMsg);

  // Prepare reply
  let reply = "";
  const msg = userMsg.toLowerCase().trim();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    reply =
      "👋 Hello!\n\nWelcome to WhatsApp Bot 🤖\n\n1️⃣ About\n2️⃣ Support\n3️⃣ Help";
  } else if (msg === "1") {
    reply = "📖 About\n\nBuilt with Node.js + WhatsApp Cloud API";
  } else if (msg === "2") {
    reply =
      "📞 Support\n\nEmail: support@example.com\nType *hi* to return to menu";
  } else if (msg === "3") {
    reply = "❓ Help\n\nType: hi, 1, 2, 3";
  } else {
    reply = `🤖 You said: "${userMsg}"\n\nType *hi* for menu`;
  }

  console.log("Reply text:", reply);

  const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: reply },
  };

  console.log("\nAPI URL:", url);
  console.log("Using token:", WHATSAPP_TOKEN?.substring(0, 30) + "...");

  try {
    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    console.log("\n✅✅✅ MESSAGE SENT SUCCESSFULLY ✅✅✅");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("\n❌❌❌ SEND FAILED ❌❌❌");
    console.error("Status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));

    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.error("\n🔴 WhatsApp API Error:");
      console.error("  Code:", err.code);
      console.error("  Type:", err.type);
      console.error("  Message:", err.message);
      console.error("  Subcode:", err.error_subcode);
      console.error("  Trace ID:", err.fbtrace_id);

      // Specific solutions
      if (err.code === 190) {
        console.error("\n💡 SOLUTION:");
        console.error("  Your access token has EXPIRED!");
        console.error("  1. Go to Meta Developer Console");
        console.error("  2. WhatsApp > API Setup");
        console.error("  3. Click 'Generate access token'");
        console.error("  4. Copy the NEW token");
        console.error("  5. Update WHATSAPP_TOKEN in Render Environment");
      } else if (err.code === 131031) {
        console.error("\n💡 SOLUTION:");
        console.error("  Recipient not in test numbers list");
        console.error("  Add", to, "to test recipients in Meta dashboard");
      } else if (err.code === 100) {
        console.error("\n💡 SOLUTION:");
        console.error("  Token is missing permissions");
        console.error("  Regenerate token with proper scopes");
      }
    }

    console.log("=".repeat(50) + "\n");
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server listening on port ${PORT}`);
  console.log(
    `📍 Webhook URL: https://watsapp-chatbot-ohkb.onrender.com/webhook\n`,
  );
});
