import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function inspect(urlOrFile, isFile = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  if (isFile) {
    const fs = await import('fs');
    const content = fs.readFileSync(path.resolve(urlOrFile), 'utf8');
    await page.setContent(content, { waitUntil: 'domcontentloaded' });
  } else {
    await page.goto(urlOrFile, { waitUntil: 'networkidle' });
  }
  await page.evaluate(() => document.fonts.ready);

  const data = await page.evaluate(() => {
    function getDetails(selector) {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const svg = el.querySelector('svg') || (el.tagName.toLowerCase() === 'svg' ? el : null);
      let svgDetails = null;
      if (svg) {
        const svgRect = svg.getBoundingClientRect();
        const svgStyle = window.getComputedStyle(svg);
        svgDetails = {
          outerHTML: svg.outerHTML,
          viewBox: svg.getAttribute('viewBox'),
          widthAttr: svg.getAttribute('width'),
          heightAttr: svg.getAttribute('height'),
          rect: {
            x: svgRect.x,
            y: svgRect.y,
            width: svgRect.width,
            height: svgRect.height
          },
          computedWidth: svgStyle.width,
          computedHeight: svgStyle.height,
          fill: svgStyle.fill,
          stroke: svgStyle.stroke,
          color: svgStyle.color
        };
      }
      return {
        selector,
        outerHTML: el.outerHTML.slice(0, 300),
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        padding: style.padding,
        margin: style.margin,
        display: style.display,
        color: style.color,
        svg: svgDetails
      };
    }

    const headerIcons = document.querySelector('.header__icons');
    const headerIconsStyle = headerIcons ? window.getComputedStyle(headerIcons) : null;
    const headerIconsRect = headerIcons ? headerIcons.getBoundingClientRect() : null;

    return {
      headerIcons: headerIcons ? {
        rect: {
          x: headerIconsRect.x,
          y: headerIconsRect.y,
          width: headerIconsRect.width,
          height: headerIconsRect.height
        },
        gap: headerIconsStyle.gap,
        display: headerIconsStyle.display,
        justifyContent: headerIconsStyle.justifyContent,
        alignItems: headerIconsStyle.alignItems
      } : null,
      search: getDetails('.header__icon--search'),
      account: getDetails('.header__icon--account'),
      cart: getDetails('.header__icon--cart'),
      cartEmptySvg: getDetails('.icon-cart-empty')
    };
  });

  await context.close();
  return data;
}

const refData = await inspect('reference/%2F.html', true);
const localData = await inspect('http://localhost:5173/', false);

console.log('=== REFERENCE DATA ===');
console.log(JSON.stringify(refData, null, 2));

console.log('=== LOCAL DATA ===');
console.log(JSON.stringify(localData, null, 2));

await browser.close();
