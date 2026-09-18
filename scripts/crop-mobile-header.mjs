import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

async function crop(imagePath, outPath) {
  const absPath = path.resolve(imagePath);
  const base64 = fs.readFileSync(absPath).toString('base64');
  await page.setContent(`<html><body style="margin:0;"><img src="data:image/png;base64,${base64}" style="display:block;"></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: 0, width: 390, height: 120 }
  });
}

await crop('qa/reference-mobile-final.png', 'qa/crop-ref-mobile-header.png');
await crop('qa/local-mobile-final.png', 'qa/crop-local-mobile-header.png');

await browser.close();
console.log('Cropped mobile header screenshots generated.');
