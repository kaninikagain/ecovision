const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\Kaninika Gain\\Downloads\\ecovision-mini-ai\\ecovision-mini-ai';
const targetDir = 'C:\\Users\\Kaninika Gain\\.gemini\\antigravity-ide\\brain\\a64ed0cc-af1b-45c4-ad75-956b748bfcca';

const files = fs.readdirSync(srcDir).filter(f => f.startsWith('screenshot_') && f.endsWith('.png'));

for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(targetDir, file);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${file} -> ${dest}`);
}
