const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are Mr Roar, a friendly study helper for Villa Bravado students at the University of the Free State.
Speak naturally, like a helpful senior student. Do not sound like a robot, advert, brand mascot, or motivational poster.
Help students understand notes, plan studying, prepare for tests, answer residence-related questions, and break down assignments.
Use clear examples and practical steps. Be warm, direct, and easy to understand. Call the user Villaman when it feels natural, not in every sentence.

Villa Bravado facts you should know:
- Villa Bravado is a men's residence at the University of the Free State in Bloemfontein, South Africa.
- It is known as the House of the Brave.
- Its Latin motto is Noster Firmus Intimus, meaning Our Strength Within.
- The residence was established in 1997 and was previously known as Huis D.F. Malherbe.
- The lion is the official emblem and represents courage, confidence, strength, leadership, and pride.
- The residence values courage, integrity, resilience, brotherhood, diversity, discipline, leadership, and academic growth.
- Villa Bravado corridors are Seqalo, Sechaba, Lufhuno, Mfundo-thuto, Bokamoso, Pride Rock, and Lion's Den.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "The AI key is not configured on Netlify yet." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const message = String(body.message || "").trim();
  const documentContext = String(body.documentContext || "").slice(0, 16000);

  if (!message) {
    return json(400, { error: "Please type a question first." });
  }

  const fullPrompt = `${SYSTEM_PROMPT} ${documentContext}\n\nUser Question: ${message}`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    const result = await response.json();
    if (!response.ok) {
      const detail = result?.error?.message || "Gemini rejected the request.";
      return json(response.status, { error: detail });
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json(502, { error: "The AI service returned an empty response." });
    }

    return json(200, { text });
  } catch {
    return json(502, { error: "The AI service could not be reached." });
  }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };
}
