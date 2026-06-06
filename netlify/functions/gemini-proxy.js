exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-fallback-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { systemInstruction, messages } = JSON.parse(event.body);
    
    // 1. Try to read from Netlify's production variable allocation
    // 2. Fallback to our custom safe header if running in branch preview/local builds
    const apiKey = process.env.GEMINI_API_KEY || event.headers["x-fallback-key"];
    
    if (!apiKey || apiKey === "undefined") {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "No valid API key detected across production environments or custom fallbacks." }) 
      };
    }

    const geminiContents = messages.map(msg => {
      const role = (msg.role === 'assistant' || msg.role === 'bot') ? 'model' : 'user';
      return {
        role: role,
        parts: [{ text: msg.content || msg.text || "" }]
      };
    });

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Error interacting with Gemini API Studio" })
      };
    }

    const textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ reply: textReply })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
