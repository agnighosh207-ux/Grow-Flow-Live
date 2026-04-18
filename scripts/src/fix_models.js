const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "..", "..", "backend", "src", "routes");

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".ts")) {
      let content = fs.readFileSync(fullPath, "utf-8");
      let modified = false;
      
      if (content.includes('"gemini-2.5-flash"') && !content.includes('response_format')) {
        content = content.replace(/"gemini-2\.5-flash",/g, '"gemini-2.5-flash",\n    response_format: { type: "json_object" },');
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log("Fixed", fullPath);
      }
    }
  }
}

walk(routesDir);
