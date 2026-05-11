import { db, templatesTable } from "@workspace/db";
import crypto from "crypto";

async function seedNicheTemplates() {
  const adminId = "user_2lI6A8Nn5G3S9X2fV1p4H7jK0mR"; // Default admin or system ID
  
  const nicheTemplates = [
    {
      name: "The Real Estate 'Under-Priced' Hook",
      category: "Promotional",
      platform: "Instagram",
      structure: "I found a [property type] in [neighborhood] that's priced [percentage]% below market value. Here's why:",
      exampleIdea: "I found a 2-bedroom condo in Bandra that's priced 15% below market value. Here's why:",
      fills: ["2-bedroom condo", "Bandra", "15"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The E-commerce 'Add to Cart' Psychology",
      category: "Educational",
      platform: "Twitter",
      structure: "Why people add to cart but don't buy: [Problem 1], [Problem 2], and the silent killer: [Problem 3]. Fix them like this:",
      exampleIdea: "Why people add to cart but don't buy: Confusing shipping, forced account creation, and the silent killer: lack of trust badges. Fix them like this:",
      fills: ["Confusing shipping", "forced account creation", "lack of trust badges"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The SaaS 'Churn Killer' Framework",
      category: "Viral",
      platform: "LinkedIn",
      structure: "Our churn dropped from [high %] to [low %] after we stopped doing [old practice] and started [new practice]. Full breakdown:",
      exampleIdea: "Our churn dropped from 8% to 2.4% after we stopped doing monthly newsletters and started personalized in-app milestones. Full breakdown:",
      fills: ["8%", "2.4%", "monthly newsletters", "personalized in-app milestones"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The Fitness 'Plateau Breaker'",
      category: "Educational",
      platform: "Instagram",
      structure: "Stuck at [current weight/metric]? Stop [common mistake] and try the [method] method for [timeframe].",
      exampleIdea: "Stuck at 80kg bench press? Stop maxing out every session and try the 5x5 progressive overload method for 4 weeks.",
      fills: ["80kg bench press", "maxing out every session", "5x5 progressive overload", "4 weeks"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The 'Day in the Life' ROI",
      category: "Story",
      platform: "YouTube",
      structure: "A day in the life of a [role] making $[amount]/month. [Timestamp] - [Activity 1], [Timestamp] - [Activity 2].",
      exampleIdea: "A day in the life of a Freelance UI Designer making $8,000/month. 08:00 - Client Strategy, 14:00 - High-Fidelity Prototyping.",
      fills: ["Freelance UI Designer", "8,000", "08:00", "Client Strategy", "14:00", "High-Fidelity Prototyping"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The Local Business 'Hidden Gem'",
      category: "Viral",
      platform: "Instagram",
      structure: "Nobody in [City] knows about this [Business Type] that has the best [Product/Service]. Look at this:",
      exampleIdea: "Nobody in Mumbai knows about this tiny Ramen shop that has the best spicy miso broth. Look at this:",
      fills: ["Mumbai", "Ramen shop", "spicy miso broth"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The 'Portfolio Roast' Hook",
      category: "Educational",
      platform: "Twitter",
      structure: "I reviewed 100+ [Niche] portfolios this week. The #1 mistake? [Mistake]. Here's the fix:",
      exampleIdea: "I reviewed 100+ Graphic Design portfolios this week. The #1 mistake? Too many tools, not enough results. Here's the fix:",
      fills: ["Graphic Design", "Too many tools, not enough results"],
      isActive: true,
      createdBy: adminId
    },
    {
      name: "The 'Tool Stack' Reveal",
      category: "Promotional",
      platform: "LinkedIn",
      structure: "The 3 tools that run my $[amount] [Business Type] business. Hint: it's not [Popular Tool].",
      exampleIdea: "The 3 tools that run my $10k Agency business. Hint: it's not Notion.",
      fills: ["10k", "Agency", "Notion"],
      isActive: true,
      createdBy: adminId
    }
  ];

  console.log("Seeding niche templates...");
  for (const template of nicheTemplates) {
    await db.insert(templatesTable).values({
      id: crypto.randomUUID(),
      ...template
    });
  }
  console.log("Done seeding niche templates!");
}

seedNicheTemplates().catch(console.error);
