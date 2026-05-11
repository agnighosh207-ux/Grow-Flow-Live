import { Router } from "express";
import sharp from "sharp";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/profile/:username", async (req, res) => {
  const { username } = req.params;
  
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) return res.status(404).send("Not found");

    const width = 1200;
    const height = 630;
    
    // Simple SVG template for OG image
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#030303"/>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.2" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.2" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        
        <circle cx="200" cy="315" r="80" fill="#06b6d4" opacity="0.1" />
        
        <text x="320" y="280" font-family="Arial" font-size="64" font-weight="900" fill="#ffffff">${user.displayName || user.firstName || "Creator"}</text>
        <text x="320" y="340" font-family="Arial" font-size="24" font-weight="700" fill="#06b6d4" letter-spacing="4 uppercase">ELITE ${user.planTier} CREATOR</text>
        
        <g transform="translate(320, 420)">
          <text x="0" y="0" font-family="Arial" font-size="32" font-weight="900" fill="#ffffff">${user.currentStreak}</text>
          <text x="0" y="30" font-family="Arial" font-size="14" font-weight="700" fill="rgba(255,255,255,0.4)" letter-spacing="2">DAY STREAK</text>
          
          <text x="200" y="0" font-family="Arial" font-size="32" font-weight="900" fill="#ffffff">${user.totalGenerations}</text>
          <text x="200" y="30" font-family="Arial" font-size="14" font-weight="700" fill="rgba(255,255,255,0.4)" letter-spacing="2">PIECES CREATED</text>
          
          <text x="450" y="0" font-family="Arial" font-size="32" font-weight="900" fill="#ffffff">${user.niche || "General"}</text>
          <text x="450" y="30" font-family="Arial" font-size="14" font-weight="700" fill="rgba(255,255,255,0.4)" letter-spacing="2">CREATOR NICHE</text>
        </g>
        
        <rect x="1000" y="550" width="160" height="40" rx="10" fill="rgba(255,255,255,0.1)" />
        <text x="1015" y="575" font-family="Arial" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="2">GROWFLOW AI</text>
      </svg>
    `;

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(png);
  } catch (err) {
    console.error("OG Generation error:", err);
    res.status(500).send("Error generating image");
  }
});

export default router;
