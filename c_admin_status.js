
import { db, usersTable } from "./lib/db/src/index.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function checkAdmin() {
  const email = process.env.ADMIN_EMAIL || "agnighosh207@gmail.com";
  console.log("Checking admin status for:", email);
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  
  if (user) {
    console.log("User found:");
    console.log("ID:", user.id);
    console.log("IsAdmin:", user.isAdmin);
    console.log("Subscription Status:", user.subscriptionStatus);
  } else {
    console.log("User not found in DB with that email.");
    
    // Check all users to see if any are admin
    const admins = await db.select().from(usersTable).where(eq(usersTable.isAdmin, true));
    console.log("Total admins in DB:", admins.length);
    admins.forEach(a => console.log("- ", a.email, "(", a.id, ")"));
  }
}

checkAdmin().catch(console.error);
