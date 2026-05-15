const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/settings/pricing.tsx', 'utf8');

// Simplified tag regex
const tagRegex = /<([a-zA-Z0-9\.]+)([^>]*?)(\/?)>|<\/([a-zA-Z0-9\.]+)>|{\/\*[\s\S]*?\*\/}/g;

const stack = [];
let match;

while ((match = tagRegex.exec(content)) !== null) {
    const full = match[0];
    const tagName = match[1];
    const attrs = match[2] || '';
    const isSelfClosing = match[3] === '/' || attrs.endsWith('/');
    const closingTagName = match[4];

    if (full.startsWith('{/*')) continue;

    if (closingTagName) {
        if (stack.length === 0) {
            console.log(`Extra closing tag: </${closingTagName}> near line ${content.substring(0, match.index).split('\n').length}`);
        } else {
            const last = stack.pop();
            if (last.name !== closingTagName) {
                console.log(`Mismatch: opened <${last.name}> (line ${last.line}), closed </${closingTagName}> (line ${content.substring(0, match.index).split('\n').length})`);
                // Put it back to try to recover
                // stack.push(last);
            }
        }
    } else if (tagName) {
        if (!isSelfClosing) {
            stack.push({ name: tagName, line: content.substring(0, match.index).split('\n').length });
        }
    }
}

console.log('Unclosed tags:', stack);
