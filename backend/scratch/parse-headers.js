const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'Desarrollo', '.gemini', 'antigravity', 'brain', '81453496-8cab-4119-8c46-96612e032baa', '.system_generated', 'steps', '457', 'content.md');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract all <h1>, <h2>, <h3> elements
  const regex = /<(h[1-4])[^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let match;
  console.log('--- HEADINGS FOUND ---');
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    console.log(`[${tag.toUpperCase()}] ${text}`);
  }
} else {
  console.log('File does not exist:', filePath);
}
