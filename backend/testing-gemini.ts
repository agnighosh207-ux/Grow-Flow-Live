import { openai } from "@workspace/integrations-openai-ai-server";

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Say hello!" }],
    });
    console.log("Success:", completion.choices[0].message.content);
  } catch (err) {
    console.error("AI API Error:", err);
  }
}
main();
