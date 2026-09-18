import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

async function crop(imagePath, outPath) {
  const absPath = path.resolve(imagePath);
  const base64 = fs.readFileSync(absPath).toString('base64');
  await page.setContent(`<html><body style="margin:0;"><img src="data:image/png;base64,${base64}" style="display:block;"></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: outPath,
    clip: { x: 900, y: 0, width: 540, height: 160 }
  });
}

await crop('qa/reference-desktop-final.png', 'qa/crop-ref-header.png');
await crop('qa/local-desktop-final.png', 'qa/crop-local-header.png');

await browser.close();
console.log('Cropped header screenshots generated successfully.');
