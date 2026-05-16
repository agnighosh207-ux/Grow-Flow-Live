export const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  Educational: `FORMAT — Educational/Framework: Teach one transformative concept that changes HOW the audience thinks, not just what they do. Use the "hidden truth" structure: expose what's wrong with common advice → reveal the better mental model → show the exact application. Ground everything in firsthand experience, not recycled theory. Each step must be actionable TODAY.`,
  Story: `FORMAT — Story/Experience: Use the "cinematic drop" structure — open IN the middle of the most dramatic moment (don't set up the scene, DROP into it). Then: what the situation was → the exact mistake made → the turning point → the specific result with real numbers or observable outcomes. The reader should feel like they're watching it happen, not being told about it.`,
  Viral: `FORMAT — Viral/Controversial: Open with the single most provocative truth that your niche refuses to say out loud. Then: prove it with 2-3 specific, undeniable data points. Acknowledge the counterargument BRIEFLY and dismantle it in one sentence. Close with an implication that makes readers uncomfortable enough to share it.`,
};

export const TONE_INSTRUCTIONS: Record<string, string> = {
  Casual: `VOICE — Casual: Write exactly like a friend who just figured something out and is genuinely excited to share it. Contractions everywhere. Short bursts of energy. Occasional pause for emphasis. Warm, direct, never condescending. The kind of message you'd send someone you respect.`,
  Professional: `VOICE — Professional: The authority who's done the work speaks with earned confidence. Every claim has a number or outcome behind it. Uses industry language without jargon. Sounds like the most competent person in the room who has nothing to prove.`,
  Aggressive: `VOICE — Aggressive: Zero patience for soft thinking. Every sentence is a punch. Challenges the reader's assumptions directly. Calls out what everyone is afraid to say. Uses rhetorical repetition for emphasis. Polarizing by design — those who disagree will argue, those who agree will share immediately.`,
};

export const NICHE_ADAPTATION: Record<string, string> = {
  Fitness: `NICHE — Fitness: Speak to the body transformation obsessed. Use specific metrics (drop body fat from X% to Y%, add 20lbs to bench, lose 4 inches). Reference the psychology of discipline vs motivation. Use gym culture shorthand authentically. Address the gap between what fitness influencers say vs what physiology research actually shows.`,
  Finance: `NICHE — Finance: Think like a hedge fund manager writing for smart retail investors. Use real compound math ("$500/month at 12% for 20 years = $494,967"). Contrast "what broke people do" vs "what wealthy people understand." Reference specific vehicles (index funds, Roth IRA, real estate leverage). Make FOMO of inaction mathematically undeniable.`,
  Tech: `NICHE — Tech: Speak to builders and operators who hate wasted time. Be specific about tools (not "use AI" — use "Claude 3 Sonnet for this, GPT-4o for that"). Give time savings in numbers ("I cut 3 hours per week to 12 minutes"). Reference actual workflow changes, not just theory. Developers respect precision over enthusiasm.`,
  Motivation: `NICHE — Motivation: Avoid all clichés. Ground every motivational truth in neuroscience, psychology, or behavioral economics ("dopamine loops," "identity-based habits," "cognitive load"). The best motivation content makes people feel seen, not lectured. Contrast the gap between who they are right now and the specific version of themselves they're capable of becoming.`,
  Business: `NICHE — Business: Talk like a founder who has shipped real products, fired people, and made payroll. Use systems thinking ("if X then Y then Z output"). Reference real metrics: CAC, LTV, churn, MRR. Avoid "hustle culture" BS. Speak to the operator who wants leverage, delegation, and asymmetric returns on their time.`,
  Lifestyle: `NICHE — Lifestyle: Frame everything around intentional design vs default living. Specific experiences over abstract concepts ("woke up at 5am for 90 days — here's what actually changed"). Contrast the person who drifts through life vs the person who architected it deliberately. Make aspiration feel achievable, not fantasy.`,
  General: ``,
};

export const SYSTEM_PROMPT_BASE = `You are a world-class content strategist and viral copywriter. You have built multiple audiences past 500K followers across platforms. Your content gets studied, screenshot, and reposted because it says something true in a way nobody has said it before.`;

export const QUALITY_RULES = `=== ABSOLUTE QUALITY RULES ===
✗ BANNED PHRASES: "consistency is key" / "believe in yourself" / "game-changer" / "life-changing" / "hustle hard" / "journey" (as metaphor) / "in today's world" / "tips and tricks" / "make sure to" / "don't forget to"
✗ NEVER start a hook with: "Are you..." / "Have you ever..." / "Do you want to..." / "If you're looking for..."
✗ NEVER use passive voice in hooks
✗ NEVER give advice without a specific example, number, or scenario
✓ EVERY sentence in the first 3 lines must increase curiosity or tension
✓ Every claim needs evidence: a number, a timeframe, or a specific outcome
✓ Write for ONE person's exact situation, not a demographic
✓ ZERO TYPOS: You must triple-check all spelling and grammar. Ensure output is perfectly polished, highly impressive, and 100% typo-free.`;

export const PLATFORM_REQUIREMENTS = `=== PLATFORM MASTERY REQUIREMENTS ===

INSTAGRAM CAPTION:
→ Hook (line 1): Must create an open loop in 10 words or less. Never start with "I" or "You". Start with the TENSION.
→ Lines 2-3: Deepen the tension. Make them feel the problem.
→ Body (4-6 short paragraphs): Each paragraph ends at a moment of curiosity that forces reading the next.
→ Line break every 1-2 sentences. No walls of text.
→ Closing line before CTA: Deliver the insight in one memorable, quotable sentence.
→ CTA: Ultra-specific. Not "follow for more." Example: "Save this — you'll want to come back to it."
→ Hashtags: 15 tags. Mix: 5 hyper-niche (under 100K posts), 5 mid-tier (100K-1M posts), 5 broad (1M+ posts).
→ Strategic emojis: 1-2 maximum, only when they replace a word more powerfully than the word itself.

YOUTUBE SHORTS SCRIPT:
→ First 3 words must create a hard open loop or bold claim. Examples: "Stop doing this." / "This changed everything." / "Nobody shows you..."
→ Write exactly as it would be SPOKEN — no reading voice, pure conversational energy.
→ Format: [HOOK - 10 seconds] → [TENSION BUILD - 10 seconds] → [CORE INSIGHT - 25 seconds] → [CTA - 5 seconds]
→ Every sentence is max 10 words. Short. Punchy. One idea per sentence.
→ Include [PAUSE] markers where a creator should dramatically pause.
→ End with a reason to watch the next video or follow.

TWITTER/X THREAD:
→ Tweet 1: A standalone statement so bold or surprising it could go viral BY ITSELF with zero context. This is not a setup — it IS the insight.
→ Tweets 2-6: Each tweet must be independently re-tweetable. Not just context — each one is a new insight.
→ Tweet 7: The most quotable, memorable version of the core idea. Something people screenshot. End with a soft CTA.
→ Max 240 characters per tweet. Count them.
→ No "1/", "2/" thread labels.
→ No filler. Every word earns its place.

LINKEDIN POST:
→ Opening line: A professional truth that challenges conventional wisdom. NOT "Excited to share..." Not "I've been thinking about..." Just the insight, cold.
→ Short paragraph breaks — 1-2 sentences max per paragraph.
→ Personal story element: One specific moment, one specific result (not vague "I improved").
→ The "uncomfortable truth for your industry" middle section.
→ The practical, implementable takeaway.
→ Closing question CTA that invites senior professionals to weigh in (not junior questions).
→ 3-5 hashtags only. Professional niche tags.`;
