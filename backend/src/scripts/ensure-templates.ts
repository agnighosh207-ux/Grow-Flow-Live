import { db, templatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

async function verifyAndSeed() {
  console.log("Checking for 'templates' table...");
  try {
    // Ensure table exists via raw SQL with correct types
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "category" varchar(100) NOT NULL,
        "platform" varchar(50) NOT NULL,
        "structure" text NOT NULL,
        "example_idea" text,
        "fills" text[],
        "use_count" integer DEFAULT 0,
        "created_by" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );
    `);
    
    // Also try to ALTER column if it exists as uuid
    try {
      await db.execute(sql`ALTER TABLE "templates" ALTER COLUMN "created_by" TYPE text;`);
    } catch (e) {}

    console.log("Table 'templates' ensured.");

    const adminId = "user_2lI6A8Nn5G3S9X2fV1p4H7jK0mR";
    const nicheTemplates = [
      {
        name: "The Real Estate 'Under-Priced' Hook",
        category: "Promotional",
        platform: "Instagram",
        structure: "I found a [property type] in [neighborhood] that's priced [percentage]% below market value. Here's why:",
        exampleIdea: "I found a 2-bedroom condo in Bandra that's priced 15% below market value. Here's why:",
        fills: ["2-bedroom condo", "Bandra", "15"]
      },
      {
        name: "The E-commerce 'Add to Cart' Psychology",
        category: "Educational",
        platform: "Twitter",
        structure: "Why people add to cart but don't buy: [Problem 1], [Problem 2], and the silent killer: [Problem 3]. Fix them like this:",
        exampleIdea: "Why people add to cart but don't buy: Confusing shipping, forced account creation, and the silent killer: lack of trust badges. Fix them like this:",
        fills: ["Confusing shipping", "forced account creation", "lack of trust badges"]
      },
      {
        name: "The SaaS 'Churn Killer' Framework",
        category: "Viral",
        platform: "LinkedIn",
        structure: "Our churn dropped from [high %] to [low %] after we stopped doing [old practice] and started [new practice]. Full breakdown:",
        exampleIdea: "Our churn dropped from 8% to 2.4% after we stopped doing monthly newsletters and started personalized in-app milestones. Full breakdown:",
        fills: ["8%", "2.4%", "monthly newsletters", "personalized in-app milestones"]
      },
      {
        name: "The Fitness 'Plateau Breaker'",
        category: "Educational",
        platform: "Instagram",
        structure: "Stuck at [current weight/metric]? Stop [common mistake] and try the [method] method for [timeframe].",
        exampleIdea: "Stuck at 80kg bench press? Stop maxing out every session and try the 5x5 progressive overload method for 4 weeks.",
        fills: ["80kg bench press", "maxing out every session", "5x5 progressive overload", "4 weeks"]
      },
      {
        name: "The 'Day in the Life' ROI",
        category: "Story",
        platform: "YouTube",
        structure: "A day in the life of a [role] making $[amount]/month. [Timestamp] - [Activity 1], [Timestamp] - [Activity 2].",
        exampleIdea: "A day in the life of a Freelance UI Designer making $8,000/month. 08:00 - Client Strategy, 14:00 - High-Fidelity Prototyping.",
        fills: ["Freelance UI Designer", "8,000", "08:00", "Client Strategy", "14:00", "High-Fidelity Prototyping"]
      }
    ];

    console.log("Seeding niche templates...");
    for (const t of nicheTemplates) {
      await db.insert(templatesTable).values({
        id: crypto.randomUUID(),
        name: t.name,
        category: t.category,
        platform: t.platform,
        structure: t.structure,
        exampleIdea: t.exampleIdea,
        fills: t.fills,
        createdBy: adminId
      }).onConflictDoNothing();
    }
    console.log("Seed complete.");

  } catch (err) {
    console.error("Operation failed:", err);
  }
}

verifyAndSeed().catch(console.error);
