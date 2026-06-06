// ============================================
// GOLD JEWELRY SYSTEM - SHARED CONFIG
// ============================================

const CONFIG = {
  // Gold API
  GOLD_API_KEY: "goldapi-c36a3e84c694a2de90aa867206add82a-io",
  GOLD_API_URL: "https://www.goldapi.io/api/XAU/OMR",

  // Telegram
  TELEGRAM_TOKEN: "8994630048:AAHL8Q95Mw8bxroByusTNbsEruNm0QVofCY",
  TELEGRAM_GROUP_ID: "8994630048",

   // Google AI Studio (Gemini)
  // GEMINI_API_KEY: "AQ.Ab8RN6JAXsjPP9irXnKUubBStLq7eSXrypxbfufVJKXNEGnAkA",
  // GEMINI_MODEL: "gemini-1.5-pro",

  // n8n Webhook URLs
  N8N_BASE: "https://swiftpixel.app.n8n.cloud",
  WEBHOOKS: {
    SAVE_ORDER: "/webhook/save-order",
    GET_CATALOG: "/webhook/get-catalog",
    GET_SALES: "/webhook/get-sales",
    STAFF_ORDERS: "/webhook/staff-orders",
    UPDATE_ORDER: "/webhook/update-order",
    NOTIFY_TEAM: "/webhook/notify-team",
  },

  // Making charges per gram (OMR)
  MAKING_CHARGES: {
    rings: 2.5,
    necklaces: 3.0,
    bracelets: 2.8,
    earrings: 2.2,
    bangles: 2.0,
    pendants: 2.5,
  },

  VAT_RATE: 0.05,
};

// ============================================
// GOLD RATE FETCHER
// ============================================

async function fetchLiveGoldRate() {
  try {
    const res = await fetch(CONFIG.GOLD_API_URL, {
      headers: {
        "x-access-token": CONFIG.GOLD_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return {
      pricePerGram24k: data.price_gram_24k,
      pricePerGram22k: data.price_gram_22k || data.price_gram_24k * (22 / 24),
      pricePerGram18k: data.price_gram_18k || data.price_gram_24k * (18 / 24),
      currency: "OMR",
      timestamp: data.timestamp,
      change: data.ch,
      changePercent: data.chp,
    };
  } catch (err) {
    console.error("Gold API error:", err);

    return {
      pricePerGram24k: 24.5,
      pricePerGram22k: 22.46,
      pricePerGram18k: 18.375,
      currency: "OMR",
      timestamp: Date.now() / 1000,
      isFallback: true,
    };
  }
}

// ============================================
// PRICE CALCULATOR
// ============================================

function calculateItemPrice(goldRate, weightGrams, karat, category) {
  const rateKey =
    karat === 24
      ? "pricePerGram24k"
      : karat === 22
      ? "pricePerGram22k"
      : "pricePerGram18k";

  const goldCost = goldRate[rateKey] * weightGrams;
  const makingCharge =
    (CONFIG.MAKING_CHARGES[category] || 2.5) * weightGrams;

  const subtotal = goldCost + makingCharge;
  const vat = subtotal * CONFIG.VAT_RATE;

  return {
    goldCost: +goldCost.toFixed(3),
    makingCharge: +makingCharge.toFixed(3),
    subtotal: +subtotal.toFixed(3),
    vat: +vat.toFixed(3),
    total: +(subtotal + vat).toFixed(3),
    currency: "OMR",
  };
}

// ============================================
// TELEGRAM NOTIFIER
// ============================================

async function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_GROUP_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram error:", err);
  }
}

// ============================================
// GOOGLE GEMINI AI HELPER (NEW)
// ============================================

async function askAI(systemPrompt, userMessage, history = []) {
  try {
    const contents = [
      ...history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        }),
      }
    );

    const data = await res.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    );
  } catch (err) {
    console.error("Gemini API error:", err);
    return "";
  }
}

// ============================================
// EXPORT (Node.js compatibility)
// ============================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    fetchLiveGoldRate,
    calculateItemPrice,
    sendTelegramMessage,
    askAI,
  };
}
