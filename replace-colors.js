const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace colors
    content = content.replace(/violet-/g, 'cyan-');
    content = content.replace(/purple-/g, 'teal-');
    content = content.replace(/fuchsia-/g, 'sky-');
    
    // Replace text-transparent bg-clip-text bg-gradient-to-r from-...  if needed, but the prefix replaces should catch from-violet-400 to from-cyan-400 automatically!
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
    }
});
