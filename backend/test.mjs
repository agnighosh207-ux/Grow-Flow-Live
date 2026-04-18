import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || 'your_groq_api_key_here'
});

async function run() {
    try {
        const res = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 6500,
            messages: [{ role: 'user', content: 'test' }]
        });
        console.log(JSON.stringify(res));
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
}
run();
