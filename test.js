const { openai } = require('./lib/integrations-openai-ai-server/dist/client.js');

async function test() {
  const niche = "Tech";
  const goal = "Grow Audience";
  const systemPrompt = `You are a content strategist... (Truncated for dummy test)
If any idea fails this test, replace it with one that passes.`;

  const userPrompt = `Generate 10 high-performing content ideas... Return ONLY this exact JSON...
{
  "ideas": [
    {
      "idea": "specific topic/title here",
      "hook": "the exact first line ready to use",
      "angle": "unique perspective that makes this stand out",
      "whyItWorks": "specific psychological mechanism at play",
      "platform": "best platform + brief reason",
      "pattern": "content pattern name"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    console.log("RESPONSE:", response.choices[0]?.message?.content);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
test();
