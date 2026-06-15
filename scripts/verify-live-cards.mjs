// One-off: load the LIVE prod site in real Chromium and verify cards render royal (not white).
import { chromium } from 'playwright';

const URL = process.env.TARGET || 'https://finalwishes-prod.web.app/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.waitForSelector('[data-slot=card]', { timeout: 20000 });
await p.waitForTimeout(1500);
// scroll through to trigger the scroll-reveal animations
for (let y = 0; y < 9000; y += 500) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(120); }
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1000);

const result = await p.evaluate(() => {
  const titles = ['Create Your Vault', 'Invite Your Circle', 'Live in Peace'];
  const threeStep = [];
  document.querySelectorAll('h4').forEach((h) => {
    if (titles.includes(h.textContent.trim())) {
      const c = h.closest('[data-slot=card]');
      threeStep.push({ title: h.textContent.trim(), cardBg: c ? getComputedStyle(c).backgroundColor : 'no-card', titleColor: getComputedStyle(h).color });
    }
  });
  const royalCards = [...document.querySelectorAll('[data-slot=card]')].filter((c) => getComputedStyle(c).backgroundColor === 'rgb(19, 51, 120)').length;
  // invisible-text scan
  function bg(el){ let e=el; while(e){ const c=getComputedStyle(e).backgroundColor; if(c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent') return c; e=e.parentElement;} return 'rgb(255, 255, 255)'; }
  let invisible=0;
  document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,li').forEach((el)=>{ const t=el.textContent.trim(); if(!t||t.length<3||el.querySelector('*')) return; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') return; if(cs.color===bg(el)) invisible++; });
  return { url: location.href, title: document.title, totalCards: document.querySelectorAll('[data-slot=card]').length, royalCards, threeStep, invisibleText: invisible };
});
console.log(JSON.stringify(result, null, 2));
// screenshot the three-steps section
await p.evaluate(() => { const s=[...document.querySelectorAll('section')].find(x=>/Three Steps/.test(x.textContent)); if(s){ s.scrollIntoView(); window.scrollBy(0,-80); } });
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/live-three-steps.png' });
await b.close();
