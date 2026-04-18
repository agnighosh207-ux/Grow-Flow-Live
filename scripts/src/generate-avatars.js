const fs = require('fs');
const path = require('path');

const avatarsDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'avatars');

const gradients = [
  { colors: ['#FF0076', '#590FB7'], id: 1 },
  { colors: ['#FF8C00', '#FF0080'], id: 2 },
  { colors: ['#00F2FE', '#4FACFE'], id: 3 },
  { colors: ['#43E97B', '#38F9D7'], id: 4 },
  { colors: ['#FA709A', '#FEE140'], id: 5 },
  { colors: ['#667EEA', '#764BA2'], id: 6 },
];

const shapes = [
  `<circle cx="50" cy="50" r="30" fill="white" opacity="0.4"/><polygon points="50,10 80,80 20,80" fill="white" opacity="0.6"/>`,
  `<rect x="20" y="20" width="60" height="60" rx="15" fill="white" opacity="0.5"/><circle cx="50" cy="50" r="20" fill="white" opacity="0.8"/>`,
  `<path d="M50 10 L80 40 L50 80 L20 40 Z" fill="white" opacity="0.6"/><circle cx="50" cy="45" r="15" fill="white" opacity="0.9"/>`,
  `<path d="M10 50 Q50 0 90 50 T10 50" fill="white" opacity="0.5"/><path d="M10 50 Q50 100 90 50 T10 50" fill="white" opacity="0.8"/>`,
  `<path d="M30 30 L70 30 L70 70 L30 70 Z" transform="rotate(45 50 50)" fill="white" opacity="0.7"/><circle cx="50" cy="50" r="15" fill="white" opacity="0.4"/>`,
  `<path d="M50 15 a20 20 0 1 1 0 40 a20 20 0 1 1 0 -40 m0 45 a25 25 0 0 0 -25 25 h50 a25 25 0 0 0 -25 -25" fill="white" opacity="0.8"/>`
];

gradients.forEach((gradient, i) => {
  const shape = shapes[i];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad${gradient.id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradient.colors[0]}" />
        <stop offset="100%" stop-color="${gradient.colors[1]}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad${gradient.id})" />
    ${shape}
  </svg>`;
  fs.writeFileSync(path.join(avatarsDir, "avatar-" + gradient.id + ".svg"), svg);
});
console.log("Avatars generated successfully!");
