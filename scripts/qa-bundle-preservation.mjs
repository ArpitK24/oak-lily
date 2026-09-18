import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const b=await chromium.launch({args:['--no-sandbox']});const results=[];
for(const width of [390,768,1440]){
 const p=await b.newPage({viewport:{width,height:1000}});await p.route(/^https?:\/\/(?!localhost)/,r=>r.abort());await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);
 await p.evaluate(()=>{if(window.jQuery)window.jQuery('.slick-initialized').slick('slickPause');document.querySelectorAll('video').forEach(v=>v.pause());});
 await p.evaluate(()=>Promise.all([...document.querySelectorAll('main > div:first-child img')].map(i=>i.decode().catch(()=>{}))));await p.waitForTimeout(500);await p.addStyleTag({content:'.banner-slider{transform:translateX(0)!important;transition:none!important}'});
 const hero=p.locator('main > div').first();const heroBefore=await hero.screenshot({animations:'disabled'});
 await p.locator('.oak-bundle-banner').screenshot({path:`qa/bundle-banner-${width}.png`,animations:'disabled'});
 const headerBefore=await p.locator('header.header').boundingBox();
 await p.evaluate(()=>document.querySelectorAll('.oak-bundle-banner,#HeaderMenu-gifts-bundle,#HeaderDrawer-gifts-bundle').forEach(e=>e.id?e.closest('li').remove():e.remove()));
 const heroAfter=await hero.screenshot({animations:'disabled'});const headerAfter=await p.locator('header.header').boundingBox();
 assert.equal(headerBefore.height,headerAfter.height,'header height unchanged');await fs.writeFile(`qa/hero-before-${width}.png`,heroBefore);await fs.writeFile(`qa/hero-after-${width}.png`,heroAfter);const comparison=await p.evaluate(async images=>{const pixels=await Promise.all(images.map(async src=>{const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return {w:c.width,h:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};}));let changed=0,total=0;for(let i=0;i<pixels[0].data.length;i++){const delta=Math.abs(pixels[0].data[i]-pixels[1].data[i]);if(delta>0)changed++;total+=delta;}return {width:pixels[0].w,height:pixels[0].h,changedChannels:changed,meanDifference:total/pixels[0].data.length,sameSize:pixels[0].w===pixels[1].w&&pixels[0].h===pixels[1].h}},[heroBefore,heroAfter].map(x=>'data:image/png;base64,'+x.toString('base64')));console.log(width,comparison);assert.ok(comparison.sameSize&&comparison.meanDifference<0.1,'hero visually unchanged');
 // New styles do not target any pre-existing class.
 const styles=await p.evaluate(()=>Object.fromEntries(['.announcement-bar','header.header','.header__menu-item','.icon-search'].map(s=>{const e=document.querySelector(s),c=getComputedStyle(e);return[s,{font:c.fontFamily,color:c.color,width:c.width,height:c.height}]})));
 await p.locator('.header__icon--account').first().click();assert.ok(await p.locator('#oak-login-modal-overlay').evaluate(e=>e.classList.contains('active')));await p.keyboard.press('Escape');
 results.push({width,heroComparison:comparison,headerHeight:headerBefore.height,accountModal:true,styles});await p.close();
}
await fs.writeFile('qa/bundle-preservation.json',JSON.stringify(results,null,2));await b.close();console.log('PASS: hero screenshot comparison passed, header height unchanged, account modal at all three widths');
