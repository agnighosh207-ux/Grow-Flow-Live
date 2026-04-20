import 'dotenv/config';
import { openai } from './lib/integrations-openai-ai-server/src/client.js'; // wait, it's typescript. I'll just write a typescript script and run it using tsx.
import { fileURLToPath } from 'url';

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Say hello!" }],
    });
    console.log("Success:", JSON.stringify(response));
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}
test();
