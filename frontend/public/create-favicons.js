// Simple script to create favicon - can be run with Node.js
// This creates an SVG favicon which modern browsers support

const fs = require('fs');

const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#2563eb" rx="8"/>
  <path 
    d="M 8 32 L 12 32 L 14 20 L 16 32 L 18 32 L 20 32 L 24 32 L 26 20 L 28 32 L 30 32 L 32 32 L 36 32 L 38 20 L 40 32 L 42 32 L 44 32 L 48 32 L 50 20 L 52 32 L 56 32"
    fill="none"
    stroke="#ffffff"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="14" cy="20" r="1.5" fill="#ffffff"/>
  <circle cx="26" cy="20" r="1.5" fill="#ffffff"/>
  <circle cx="38" cy="20" r="1.5" fill="#ffffff"/>
  <circle cx="50" cy="20" r="1.5" fill="#ffffff"/>
</svg>`;

fs.writeFileSync('favicon.svg', svgFavicon);
console.log('✅ Created favicon.svg');

