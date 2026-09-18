import {load} from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';const exec=promisify(execFile);
const origin='https://oakandlily.in';
const output='public';await fs.mkdir(output+'/assets',{recursive:true});await fs.mkdir('reference',{recursive:true});
const assets=new Map(), pages=new Map();let errors=[];
async function get(url){for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(r.status);return r;}catch(e){if(i===2)throw e;}}}
function asset(raw){if(!raw||/^(data:|#|javascript:)/.test(raw))return raw;const url=new URL(raw,origin).href;if(assets.has(url))return assets.get(url);const ext=path.extname(new URL(url).pathname)||'.bin';const name='/assets/'+crypto.createHash('sha256').update(url).digest('hex').slice(0,16)+ext;assets.set(url,name);return name;}
function css(text,base=origin){return text.replace(/url\((['"]?)(.*?)\1\)/g,(all,q,u)=>u.startsWith('data:')?all:`url("${asset(new URL(u,base).href)}")`);}
function links(html){const $=load(html);return [...new Set($('a[href]').map((i,e)=>{try{const u=new URL($(e).attr('href'),origin);return u.origin===origin&&/^\/(collections|products|pages|policies|blogs)(\/|$)/.test(u.pathname)?u.pathname:null}catch{return null}}).get())];}
async function capture(route){try{const cached=await fs.readFile('reference/'+encodeURIComponent(route)+'.html','utf8').catch(()=>null);const html=cached||(route==='/'?await fs.readFile('/tmp/oak-reference.html','utf8'):await (await get(origin+route)).text());pages.set(route,html);await fs.writeFile('reference/'+encodeURIComponent(route)+'.html',html);return links(html);}catch(e){errors.push({route,error:String(e)});return [];}}
async function pool(items,fn,limit=6){let n=0;await Promise.all(Array.from({length:limit},async()=>{while(n<items.length)await fn(items[n++]);}));}
const mainLinks=await capture('/');await pool([...new Set([...mainLinks,'/search','/cart'])],capture);
const secondary=[...new Set([...pages.values()].flatMap(links))].filter(x=>!pages.has(x)&&(/^\/products\//.test(x)||/^\/blogs\/news\//.test(x)));
console.log('Primary pages',pages.size,'Product/article pages',secondary.length);await pool(secondary,async route=>{await capture(route);await new Promise(r=>setTimeout(r,800));},1);
const catalog=[];
for(const [route,html] of pages){const $=load(html);
 $('script').each((i,e)=>{const el=$(e),src=el.attr('src'),t=el.text(),type=el.attr('type');if(src){if(!/\/cdn\/shop\/t\/2\/|cdnjs.cloudflare.com|code.jquery.com|judgeme.*\/(loader|carousels)\.js/.test(src))el.remove();else el.attr('src',asset(src));}else if(type==='application/ld+json'||type==='application/json'){if(/accessToken/.test(t))el.remove();}else if(!/document.addEventListener\("DOMContentLoaded"|\$\(document\).ready|window.routes =|window.jdgm|jdgmThemeFixes|jdgmTheme|const shared =|Shopify.designMode|customElements.define/.test(t))el.remove();});
 $('noscript').each((i,e)=>{if(/facebook|googletagmanager/.test($(e).html()))$(e).remove();});
 $('link').each((i,e)=>{const el=$(e),rel=el.attr('rel')||'';if(/preconnect|dns-prefetch|canonical|alternate/.test(rel))el.remove();else if(/stylesheet|icon|preload/.test(rel)&&el.attr('href'))el.attr('href',asset(el.attr('href')));});
 $('img,source,video').each((i,e)=>{const el=$(e);for(const attr of ['src','poster'])if(el.attr(attr))el.attr(attr,asset(el.attr(attr)));if(el.attr('srcset')){const variants=el.attr('srcset').split(',').map(v=>v.trim().split(/\s+/));let best=variants.filter(v=>parseInt(v[1])<=1600).at(-1)||variants[0];el.attr('src',asset(best[0]));el.removeAttr('srcset');}});
 $('style').each((i,e)=>$(e).text(css($(e).text())));$('[style]').each((i,e)=>$(e).attr('style',css($(e).attr('style'))));
 $('a[href]').each((i,e)=>{let href=$(e).attr('href');if(href.startsWith(origin))$(e).attr('href',href.slice(origin.length)||'/');});
 $('script').each((i,e)=>{if(!$(e).attr('src'))$(e).text($(e).text().replace("window.shopUrl = 'https://oakandlily.in'","window.shopUrl = location.origin"));});
 $('head').prepend('<script>window.Shopify={shop:"e7a934-55.myshopify.com",locale:"en",currency:{active:"INR",rate:"1.0"},country:"IN",routes:{root:"/"},designMode:false,PaymentButton:{init(){}}};</script><script src="/replica.js" defer></script>');
 // Preserve all original presentation; only bridge server-dependent commerce locally.
 if(route.startsWith('/products/')){const ld=$('script[type="application/ld+json"]').map((i,e)=>{try{return JSON.parse($(e).text())}catch{return null}}).get().find(x=>x['@type']==='Product');let variants=[];$('script[type="application/json"]').each((i,e)=>{try{const v=JSON.parse($(e).text());if(Array.isArray(v)&&v[0]?.id)variants=v;else if(v.id&&v.price!==undefined)variants.push(v);}catch{}});catalog.push({url:route,title:ld?.name||$('h1').first().text().trim(),image:$('product-info img').first().attr('src'),price:ld?.offers?.price||ld?.offers?.[0]?.price||0,variants});}
 const target=route==='/'?output+'/index.html':output+route+'/index.html';await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,$.html());}
console.log('Pages',pages.size,'Assets queued',assets.size);
let done=new Set();while(done.size<assets.size){const batch=[...assets.entries()].filter(([u])=>!done.has(u));await pool(batch,async([url,file])=>{done.add(url);try{await fs.access(output+file);return;}catch{}try{const response=await exec('curl',['-f','-L','-s','--retry','2','--max-time','90',url],{encoding:'buffer',maxBuffer:100*1024*1024});let body=response.stdout;if(/\.css(?:\?|$)/.test(url))body=css(Buffer.from(body).toString(),url);await fs.writeFile(output+file,typeof body==='string'?body:Buffer.from(body));}catch(e){errors.push({url,error:String(e)});}},10);console.log('Downloaded',done.size,'of',assets.size);}
await fs.writeFile(output+'/catalog.json',JSON.stringify(catalog));await fs.writeFile('reference/manifest.json',JSON.stringify({pages:[...pages.keys()],assets:[...assets],errors},null,2));console.log('Complete',pages.size,'pages',assets.size,'assets',errors.length,'errors');
