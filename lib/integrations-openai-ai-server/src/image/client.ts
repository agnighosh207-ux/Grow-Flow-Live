import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

// Image generation requires OpenAI API (not available in Groq)
const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

// Images are optional when using Groq
const hasImageSupport = !!apiKey;

if (!hasImageSupport) {
  console.warn("⚠️  Image generation unavailable: OPENAI_API_KEY not configured. Using text-only mode with Groq.");
}

let openai: OpenAI | null = null;
if (hasImageSupport) {
  openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export { openai };

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  if (!openai || !hasImageSupport) {
    throw new Error(
      "Image generation is not available. OPENAI_API_KEY must be set for image generation features. " +
      "You can still use Groq for text generation."
    );
  }
  const response = await openai.images.generate({
    model: "gpt-4-turbo",
    prompt,
    size,
    n: 1,
  });
  const base64 = response.data?.[0]?.b64_json ?? "";
  if (!base64) {
    throw new Error("Image generation failed: no base64 data returned");
  }
  return Buffer.from(base64, "base64");
}

export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  if (!openai || !hasImageSupport) {
    throw new Error("Image generation is not available. OPENAI_API_KEY must be set.");
  }

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt,
  });

  const imageBase64 = response.data?.[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}
