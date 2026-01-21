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
console.log(
  "WHATSAPP_TOKEN (first 20 chars):",
  WHATSAPP_TOKEN?.substring(0, 20),
);
console.log("WHATSAPP_TOKEN length:", WHATSAPP_TOKEN?.length);

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
  console.log("\n\n🔥 ========== NEW WEBHOOK HIT ========== 🔥");
  console.log("Full body:", JSON.stringify(req.body, null, 2));

  // Respond to Facebook immediately
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    if (!entry) {
      console.log("⚠️ No entry in webhook");
      return;
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      console.log("⚠️ No changes in entry");
      return;
    }

    const value = changes.value;
    if (!value) {
      console.log("⚠️ No value in changes");
      return;
    }

    console.log("✅ Value extracted:", JSON.stringify(value, null, 2));

    // Check for messages
    if (!value.messages || value.messages.length === 0) {
      console.log("⚠️ No messages in value - might be a status update");
      if (value.statuses) {
        console.log(
          "📊 Status update:",
          JSON.stringify(value.statuses, null, 2),
        );
      }
      return;
    }

    const message = value.messages[0];
    const from = message.from;
    const messageId = message.id;
    const text = message.text?.body || "";

    console.log("\n📩 MESSAGE DETAILS:");
    console.log("  From:", from);
    console.log("  Message ID:", messageId);
    console.log("  Text:", text);
    console.log("  Type:", message.type);

    if (!text) {
      console.log("⚠️ No text body in message");
      return;
    }

    // Try to send reply
    console.log("\n📤 Attempting to send reply...");
    await sendReply(from, text, messageId);
  } catch (err) {
    console.error("\n❌ ========== WEBHOOK ERROR ========== ❌");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error(
        "Response data:",
        JSON.stringify(err.response.data, null, 2),
      );
    }
  }
});

// ================== SEND REPLY ==================
async function sendReply(to, receivedMsg, messageId) {
  console.log(`\n🎯 sendReply called with:`);
  console.log(`  To: ${to}`);
  console.log(`  Message: ${receivedMsg}`);
  console.log(`  Message ID: ${messageId}`);

  // First, try to mark message as read
  try {
    console.log("\n📖 Marking message as read...");
    const readUrl = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

    await axios.post(
      readUrl,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("✅ Message marked as read");
  } catch (error) {
    console.error("⚠️ Failed to mark as read (non-critical)");
    console.error(JSON.stringify(error.response?.data, null, 2));
  }

  // Generate reply text
  let replyText = "";
  const msg = receivedMsg.toLowerCase().trim();

  if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
    replyText =
      "👋 Hello! Welcome to WhatsApp Bot 🤖\n\n1️⃣ About\n2️⃣ Support\n3️⃣ Help";
  } else if (msg === "1") {
    replyText =
      "📖 About\n\nThis bot is built with Node.js + WhatsApp Cloud API";
  } else if (msg === "2") {
    replyText = "📞 Support\n\nEmail: support@example.com";
  } else if (msg === "3") {
    replyText = "❓ Help\n\nType: hi, 1, 2, 3";
  } else {
    replyText = `🤖 You said: "${receivedMsg}"\n\nType *hi* for menu.`;
  }

  console.log(`\n💬 Reply text prepared: "${replyText}"`);

  // Send the reply
  const sendUrl = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

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

  console.log("\n📡 API Request Details:");
  console.log("  URL:", sendUrl);
  console.log("  Payload:", JSON.stringify(payload, null, 2));
  console.log("  Token (first 20):", WHATSAPP_TOKEN?.substring(0, 20));

  try {
    const response = await axios.post(sendUrl, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("\n✅ ========== MESSAGE SENT SUCCESSFULLY ========== ✅");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("\n❌ ========== SEND MESSAGE FAILED ========== ❌");

    if (error.response) {
      console.error("Status Code:", error.response.status);
      console.error("Status Text:", error.response.statusText);
      console.error(
        "Response Headers:",
        JSON.stringify(error.response.headers, null, 2),
      );
      console.error(
        "Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );

      const errData = error.response.data?.error;
      if (errData) {
        console.error("\n🔴 WhatsApp API Error Details:");
        console.error("  Message:", errData.message);
        console.error("  Type:", errData.type);
        console.error("  Code:", errData.code);
        console.error("  Error Subcode:", errData.error_subcode);
        console.error("  FBTrace ID:", errData.fbtrace_id);

        // Common error explanations
        if (errData.code === 131031) {
          console.error(
            "\n💡 SOLUTION: Add recipient to test phone numbers in Meta dashboard",
          );
        } else if (errData.code === 100) {
          console.error(
            "\n💡 SOLUTION: Check if token has correct permissions",
          );
        } else if (errData.code === 190) {
          console.error(
            "\n💡 SOLUTION: Token is invalid or expired - regenerate it",
          );
        }
      }
    } else if (error.request) {
      console.error("Request was made but no response received");
      console.error("Request:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }

    console.error("\nFull error:", error);
    throw error;
  }
}

// ================== START SERVER ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`\n🚀 ========== SERVER STARTED ========== 🚀`);
  console.log(`Port: ${PORT}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(50));
});
