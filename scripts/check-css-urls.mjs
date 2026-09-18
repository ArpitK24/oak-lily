import fs from 'node:fs';
import path from 'node:path';

const assetsDir = 'public/assets';
const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
cssFiles.push('../replica.css');

const missingUrls = [];

for (const file of cssFiles) {
  const cssPath = path.join(assetsDir, file);
  if (!fs.existsSync(cssPath)) continue;
  const content = fs.readFileSync(cssPath, 'utf8');
  const matches = content.matchAll(/url\((['"]?)(.*?)\1\)/g);
  for (const m of matches) {
    let url = m[2].trim();
    if (url.startsWith('data:') || !url) continue;
    url = url.split('?')[0].split('#')[0];
    let resolved;
    if (url.startsWith('/')) {
      resolved = path.join('public', url);
    } else {
      resolved = path.resolve(path.dirname(cssPath), url);
    }
    if (!fs.existsSync(resolved)) {
      missingUrls.push({ file, url, resolved });
    }
  }
}

console.log('Missing CSS urls count:', missingUrls.length);
for (const m of missingUrls.slice(0, 30)) {
  console.log(m);
}
