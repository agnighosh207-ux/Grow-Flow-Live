import { db, vaultItemsTable } from "@workspace/db";
import crypto from "crypto";

const vaultItems = [
  // Fitness
  {
    id: crypto.randomUUID(),
    title: "The 7-Minute Morning Routine",
    platform: "Instagram",
    niche: "Fitness",
    contentType: "Carousel",
    hookText: "I tried 50 different morning routines. This 7-minute sequence is the only one that stuck.",
    whyItWorks: "Uses personal experimentation (authority) and a low barrier to entry (7 minutes).",
    estimatedReach: "500K+",
    format: "carousel",
    tags: ["morning", "productivity", "routine"],
  },
  {
    id: crypto.randomUUID(),
    title: "Why Your Squat Isn't Growing",
    platform: "YouTube",
    niche: "Fitness",
    contentType: "Short",
    hookText: "Stop squatting like this if you want bigger legs.",
    whyItWorks: "Negative hook that identifies a common mistake, creating immediate curiosity.",
    estimatedReach: "1M+",
    format: "short",
    tags: ["squat", "legday", "form"],
  },
  // Finance
  {
    id: crypto.randomUUID(),
    title: "The $100/Week Strategy",
    platform: "Twitter",
    niche: "Finance",
    contentType: "Thread",
    hookText: "How to turn $100/week into a $1M portfolio (without picking individual stocks).",
    whyItWorks: "Specific numbers and a 'lazy' benefit (no stock picking) make it highly shareable.",
    estimatedReach: "250K+",
    format: "thread",
    tags: ["investing", "wealth", "etfs"],
  },
  {
    id: crypto.randomUUID(),
    title: "The Silent Killer of Wealth",
    platform: "LinkedIn",
    niche: "Finance",
    contentType: "Post",
    hookText: "It's not your Starbucks habit. It's 'lifestyle creep' that's keeping you middle class.",
    whyItWorks: "Challenges a popular myth (Starbucks) and identifies a deeper, more relatable problem.",
    estimatedReach: "100K+",
    format: "post",
    tags: ["mindset", "wealth", "psychology"],
  },
  // Tech
  {
    id: crypto.randomUUID(),
    title: "5 AI Tools to Save 10 Hours",
    platform: "Twitter",
    niche: "Tech",
    contentType: "Thread",
    hookText: "AI is moving too fast. If you're still doing these 5 things manually, you're losing money.",
    whyItWorks: "Fear of missing out (FOMO) combined with a clear time-saving benefit.",
    estimatedReach: "750K+",
    format: "thread",
    tags: ["ai", "productivity", "tools"],
  },
  {
    id: crypto.randomUUID(),
    title: "The Brutal Truth About Coding",
    platform: "YouTube",
    niche: "Tech",
    contentType: "Short",
    hookText: "Stop learning 10 languages. Master these 3 concepts instead.",
    whyItWorks: "Contrarian advice that simplifies a complex field.",
    estimatedReach: "1.2M+",
    format: "short",
    tags: ["coding", "career", "developer"],
  },
  // Business
  {
    id: crypto.randomUUID(),
    title: "How I Scaled to $10k/mo",
    platform: "Instagram",
    niche: "Business",
    contentType: "Reel",
    hookText: "Everyone told me I needed a team. I hit $10k/mo as a solo creator using this 1 system.",
    whyItWorks: "Solo-founder appeal and 'against the grain' success story.",
    estimatedReach: "400K+",
    format: "reel",
    tags: ["solopreneur", "business", "scaling"],
  },
  {
    id: crypto.randomUUID(),
    title: "The Best Marketing Hack of 2024",
    platform: "LinkedIn",
    niche: "Business",
    contentType: "Post",
    hookText: "Marketing isn't about being seen. It's about being remembered. Here's the difference.",
    whyItWorks: "Philosophical shift that makes the reader feel like they're getting an 'insider' secret.",
    estimatedReach: "150K+",
    format: "post",
    tags: ["marketing", "branding", "growth"],
  },
];

// Replicate these to reach ~40 items with variations
const niches = ["Fitness", "Finance", "Tech", "Business", "Motivation", "Lifestyle"];
const platforms = ["Instagram", "Twitter", "LinkedIn", "YouTube"];
const formats = ["carousel", "reel", "thread", "short", "post"];

const finalItems = [...vaultItems];

while (finalItems.length < 40) {
    const base = vaultItems[Math.floor(Math.random() * vaultItems.length)];
    finalItems.push({
        ...base,
        id: crypto.randomUUID(),
        niche: niches[finalItems.length % niches.length],
        platform: platforms[finalItems.length % platforms.length],
        format: formats[finalItems.length % formats.length],
        title: `${base.title} (v${finalItems.length})`,
    });
}

async function seed() {
  const [existing] = await db.select().from(vaultItemsTable).limit(1);
  if (existing) {
    console.log("Vault already seeded. Skipping.");
    process.exit(0);
  }
  console.log("🌱 Seeding Vault Items...");
  try {
    await db.insert(vaultItemsTable).values(finalItems);
    console.log("✅ Seeded 40 Vault Items successfully.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

seed().then(() => process.exit(0));
