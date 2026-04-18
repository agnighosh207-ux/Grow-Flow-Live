import * as fs from 'fs';
import * as path from 'path';

const routesDir = path.join(__dirname, '..', '..', 'backend', 'src', 'routes');

const walk = (dir: string) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const newAuth = `const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  let userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { return res.status(401).json({ error: "Unauthorized" }); }
  
  if (req.headers["x-impersonate-user"] && (auth?.sessionClaims?.email === "agnighosh207@gmail.com" || userId === "user_...")) { // Needs to be secure... wait, Clerk doesnt give email for sure if auth.sessionClaims not configured.
    // Instead of hacking email here, we can just look up usersTable if it's not too slow.
    // Or just do a quick string match on the auth session claims if they are set. 
  }
`;
    }
  }
}
