import fs from 'fs';
import path from 'path';

function traverseAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseAndReplace(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('"gpt-4o"')) {
        const newContent = content.replace(/"gpt-4o"/g, '"gemini-1.5-pro"');
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

console.log('Starting replacement...');
traverseAndReplace('./artifacts/api-server/src');
console.log('Done.');
