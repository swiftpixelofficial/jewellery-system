exports.handler = async function (event, context) {
  // Handle preflight CORS requests if needed
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
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
    
    // Retrieve your key from Netlify's Environment Variables safely
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "GEMINI_API_KEY is not defined in Netlify variables." }) 
      };
    }

    // Convert standard chat history formats to Gemini's native format
    // Roles map: 'user' -> 'user', 'assistant'/'bot' -> 'model'
    const geminiContents = messages.map(msg => {
      const role = (msg.role === 'assistant' || msg.role === 'bot') ? 'model' : 'user';
      return {
        role: role,
        parts: [{ text: msg.content || msg.text || "" }]
      };
    });

    // Target the stable Gemini 1.5 Pro or Flash via standard API Architecture
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

    // Using native global fetch - zero dependencies required
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || "Error interacting with Gemini API Studio" })
      };
    }

    // Safely extract the generated string response text
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
