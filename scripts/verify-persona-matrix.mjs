// Persona × surface LIVE-render verification matrix (claude-home binding criteria, 2026-06-19).
// Logs into finalwishes-prod.web.app as each seeded persona-QA account (real sessions, prod,
// NOT localhost/mocked) and walks every estate section, capturing per cell:
//   landed URL · console errors · rendered text · invisible-text(white-card) scan · spinner-stuck
//   · access-gate detection · screenshot. Classifies vs PERSONA_ACCESS (expected allow/block).
//
//   node scripts/verify-persona-matrix.mjs            # full run
//   PERSONAS=heir SECTIONS=vault,dashboard node ...    # subset
//
// Prereq: scripts/seed-persona-qa.js has seeded estate_persona_qa + persona-* accounts.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.TARGET || 'https://finalwishes-prod.web.app';
const ESTATE = 'estate_persona_qa';
const EVID = 'scripts/persona-matrix-evidence';
mkdirSync(EVID, { recursive: true });

// Expected route access (mirrors web/src/lib/persona.ts PERSONA_ACCESS). true=allow, absent=block.
const ALL = ['dashboard','life-chapters','soul-log','memoirs','heirlooms','assets','vault','forms',
  'lockbox','directives','timecapsule','beneficiaries','events','obituary','probate','notifications',
  'pricing','settings','attestation','estates','index'];
const ACCESS = {
  principal: ALL.filter(s => s !== 'attestation'),
  executor: ['dashboard','assets','vault','directives','beneficiaries','events','obituary','probate','notifications','settings','attestation','estates','index'],
  trustee:  ['dashboard','assets','vault','directives','beneficiaries','probate','notifications','settings','attestation','estates','index'],
  heir:     ['dashboard','life-chapters','soul-log','memoirs','heirlooms','assets','directives','timecapsule','events','obituary','notifications','settings','attestation','index'],
  legal:    ['dashboard','assets','vault','forms','directives','notifications','settings','attestation','estates','index'],
  cpa:      ['dashboard','assets','vault','notifications','settings','attestation','estates','index'],
};
const PERSONAS = (process.env.PERSONAS || 'principal,heir,executor,trustee,legal,cpa').split(',');
const SECTIONS = (process.env.SECTIONS || ALL.join(',')).split(',');
const pw = k => `PersonaQA2026!${k}`;
const email = k => `persona-${k}@finalwishes.app`;
// 'index' = the estate root; others are /estates/<id>/<section>
const routeFor = s => s === 'index' ? `/estates/${ESTATE}` : `/estates/${ESTATE}/${s}`;

async function login(ctx, key) {
  const p = await ctx.newPage();
  // /login auto-opens the sign-in modal (redirects to landing with the dialog open).
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(2500);
  if (!(await p.locator('#modal-identifier').count())) {
    await p.locator('button:has-text("Sign In")').first().click({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.waitForSelector('#modal-identifier', { timeout: 12000 });
  await p.fill('#modal-identifier', email(key));
  await p.fill('#modal-password', pw(key));
  await p.locator('#modal-password').press('Enter');
  // wait until the modal closes / auth resolves
  await p.waitForTimeout(5000);
  const loggedIn = await p.evaluate(() => !document.querySelector('#modal-identifier'));
  // Dismiss the first-run welcome interstitial ONCE (persists to localStorage in this context),
  // else it intercepts every section route. OwnerWelcome="Start Building Your Legacy",
  // HeirWelcome="View Estate Details".
  if (loggedIn) {
    await p.goto(BASE + `/estates/${ESTATE}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(3000);
    for (const label of ['Start Building Your Legacy', 'View Estate Details']) {
      const btn = p.locator(`button:has-text("${label}")`).first();
      if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(1500); break; }
    }
  }
  await p.close();
  return loggedIn;
}

async function checkCell(ctx, key, section) {
  const allow = ACCESS[key]?.includes(section);
  const errs = [];
  const p = await ctx.newPage();
  p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  p.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 160)));
  let status = '?';
  try {
    const resp = await p.goto(BASE + routeFor(section), { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = resp ? resp.status() : 'no-resp';
    await p.waitForTimeout(5000); // lazy routes + Firestore data settle
  } catch (e) { errs.push('NAV: ' + String(e).slice(0, 120)); }
  const info = await p.evaluate(() => {
    const txt = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    const heading = [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent||'').trim()).filter(Boolean).slice(0,3).join(' | ');
    let invis = 0;
    document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,div').forEach(el => {
      const t = (el.textContent || '').trim(); if (!t || t.length > 200) return;
      const s = getComputedStyle(el);
      if (s.color === s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') invis++;
    });
    const spinners = document.querySelectorAll('[class*="animate-spin"],[role=progressbar],[aria-busy=true]').length;
    const gate = /not authorized|don.?t have (access|permission)|not available|access denied|no access|restricted|isn.?t available for your role/i.test(txt);
    return { landed: location.pathname, textLen: txt.length, heading, sample: txt.slice(0, 120), invis, spinners, gate };
  });
  const shot = `${EVID}/${key}__${section}.png`;
  await p.screenshot({ path: shot }).catch(() => {});
  await p.close();

  // classify
  const stuckSpinner = info.spinners > 0 && info.textLen < 80;
  const blank = info.textLen < 40;
  const hasErr = errs.length > 0;
  let verdict, note;
  if (allow) {
    if (blank || stuckSpinner) { verdict = 'FAIL'; note = blank ? 'blank/empty render' : 'stuck spinner'; }
    else if (info.invis > 0) { verdict = 'FAIL'; note = `${info.invis} invisible-text (white-card)`; }
    else if (hasErr) { verdict = 'WARN'; note = 'console error: ' + errs[0]; }
    else { verdict = 'PASS'; note = 'renders'; }
  } else { // expected block → must be intentional gate, NOT a crash/blank
    if (hasErr && /permission|denied|insufficient/i.test(errs.join(' '))) { verdict = 'FAIL'; note = 'raw permission-denied: ' + errs[0]; }
    else if (info.gate) { verdict = 'PASS'; note = 'intentional gate UI'; }
    else if (info.landed !== routeFor(section) && info.textLen > 80 && !blank) { verdict = 'PASS'; note = `redirected → ${info.landed} (gate)`; }
    else if (blank || stuckSpinner) { verdict = 'FAIL'; note = 'blank/stuck on blocked route (no gate UI)'; }
    else if (hasErr) { verdict = 'WARN'; note = 'console error on blocked route: ' + errs[0]; }
    else { verdict = 'PASS?'; note = `renders on blocked route (verify scoping): "${info.sample.slice(0,50)}"`; }
  }
  return { persona: key, section, expect: allow ? 'allow' : 'block', verdict, note,
           landed: info.landed, status, textLen: info.textLen, heading: info.heading, sample: info.sample, invis: info.invis, errs: errs.length, shot };
}

const b = await chromium.launch();
const rows = [];
for (const key of PERSONAS) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const ok = await login(ctx, key);
  console.log(`\n=== ${key} === login: ${ok ? 'OK' : 'FAILED'}`);
  if (!ok) { rows.push({ persona: key, section: '(login)', verdict: 'FAIL', note: 'login failed', expect: '-', landed: '-', status: '-', textLen: 0, invis: 0, errs: 0 }); await ctx.close(); continue; }
  for (const s of SECTIONS) {
    const r = await checkCell(ctx, key, s);
    rows.push(r);
    console.log(`  ${r.verdict.padEnd(5)} ${s.padEnd(14)} expect=${r.expect.padEnd(5)} landed=${(r.landed||'').padEnd(34)} txt=${String(r.textLen).padEnd(5)} err=${r.errs} ${r.note}`);
  }
  await ctx.close();
}
await b.close();
writeFileSync('scripts/persona-matrix-results.json', JSON.stringify(rows, null, 2));
const fails = rows.filter(r => r.verdict === 'FAIL');
const warns = rows.filter(r => /WARN|PASS\?/.test(r.verdict));
console.log(`\n==== SUMMARY: ${rows.length} cells | PASS ${rows.filter(r=>r.verdict==='PASS').length} | FAIL ${fails.length} | WARN/REVIEW ${warns.length} ====`);
fails.forEach(f => console.log(`  FAIL ${f.persona}/${f.section}: ${f.note}`));
warns.forEach(w => console.log(`  REVIEW ${w.persona}/${w.section}: ${w.note}`));
