import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

function walk(dir) {
  let files = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) files.push(...walk(full));
    else if (dirent.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const htmlFiles = walk('public');
const missing = new Set();
const external = new Set();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = load(html);
  $('img, source, video').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('poster');
    if (!src) return;
    if (src.startsWith('//') || src.startsWith('http://') || src.startsWith('https://')) {
      external.add(src + ' in ' + file);
    } else if (src.startsWith('/')) {
      const target = path.join('public', src.split('?')[0]);
      if (!fs.existsSync(target)) {
        missing.add(src + ' in ' + file);
      }
    }
  });
}

console.log('Missing local assets:', missing.size);
for (const m of Array.from(missing).slice(0, 20)) console.log('Missing:', m);
console.log('External asset references:', external.size);
for (const e of Array.from(external).slice(0, 20)) console.log('External:', e);
