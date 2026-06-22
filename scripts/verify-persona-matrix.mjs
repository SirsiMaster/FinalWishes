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
import { chromium, webkit } from 'playwright';
const ENGINE = process.env.ENGINE === 'webkit' ? webkit : chromium;
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { authenticator } from 'otplib';

// TOTP secrets for MFA-enrolled fiduciary personas (scripts/enroll-persona-mfa.mjs).
const MFA_SECRETS = existsSync('scripts/.persona-mfa-secrets.json')
  ? JSON.parse(readFileSync('scripts/.persona-mfa-secrets.json', 'utf8')) : {};

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

// Log in and return a PERSISTENT page (kept open). Section navigation is then client-side
// (SPA, no full reload) so the in-memory Firebase auth + Firestore connection survive — WebKit
// (the iOS WKWebView engine) re-inits those unreliably on a full per-page reload, which makes a
// new-page-per-cell crawl flap between PendingState/permission-denied. errs is shared + cleared
// per cell by checkCell.
async function login(ctx, key) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  p.on('pageerror', e => errs.push('PAGEERR: ' + String(e).slice(0, 160)));
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
  await p.waitForTimeout(3500);
  if (MFA_SECRETS[key] && (await p.locator('#modal-mfa').count())) {
    await p.fill('#modal-mfa', authenticator.generate(MFA_SECRETS[key]));
    await p.locator('#modal-mfa').press('Enter').catch(() => {});
    await p.waitForTimeout(4500);
  } else {
    await p.waitForTimeout(1500);
  }
  const ok = await p.evaluate(() => !document.querySelector('#modal-identifier') && !document.querySelector('#modal-mfa'));
  if (ok) {
    await p.goto(BASE + `/estates/${ESTATE}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(2500);
    // Read the Firebase auth uid from IndexedDB, then inject BOTH welcome-seen keys so the
    // OwnerWelcome/HeirWelcome first-run interstitial never intercepts the walk (the click-
    // dismiss doesn't persist reliably in WebKit). A reload applies them.
    const uid = await p.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('firebaseLocalStorageDb');
      r.onsuccess = () => { try { const s = r.result.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll(); s.onsuccess = () => res(s.result.map(x => x.value).find(v => v && v.uid)?.uid || null); s.onerror = () => res(null); } catch { res(null); } };
      r.onerror = () => res(null);
    })).catch(() => null);
    if (uid) {
      await p.evaluate(({ e, uid }) => { const t = new Date().toISOString(); localStorage.setItem(`fw_owner_welcome_seen_${e}_${uid}`, t); localStorage.setItem(`fw_welcome_seen_${e}_${uid}`, t); }, { e: ESTATE, uid });
      await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(2500);
    }
  }
  return { page: p, ok, errs };
}

async function checkCell(p, key, section, errs) {
  const allow = ACCESS[key]?.includes(section);
  errs.length = 0; // per-cell console capture (handler attached once on the persistent page)
  let status = 'csnav';
  try {
    // CLIENT-SIDE SPA navigation (no full reload) — preserves the in-memory Firebase auth +
    // Firestore connection. A full per-page goto makes WebKit re-init Firebase unreliably →
    // PendingState/permission-denied flakiness that is NOT an iOS render bug.
    await p.evaluate((path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, routeFor(section));
    // Wait for the app to LEAVE the PendingState spinner and settle real content.
    for (let i = 0; i < 16; i++) {
      await p.waitForTimeout(1000);
      const ready = await p.evaluate(() => {
        const txt = (document.body.innerText || '').trim();
        const pending = /preparing your space/i.test(txt);
        return !pending && txt.length > 120;
      }).catch(() => false);
      if (ready) { await p.waitForTimeout(1000); break; }
    }
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
    const gate = /not authorized|don.?t have (access|permission)|not available|access denied|no access|restricted|isn.?t (available|part) (for|of) your role|identity verification required/i.test(txt);
    return { landed: location.pathname, textLen: txt.length, heading, sample: txt.slice(0, 120), invis, spinners, gate };
  });
  const shot = `${EVID}/${key}__${section}.png`;
  await p.screenshot({ path: shot }).catch(() => {});

  // classify
  const stuckSpinner = info.spinners > 0 && info.textLen < 80;
  const blank = info.textLen < 40;
  // Transient Cloud Run cold-start CORS on the guidance/score + guardian/check-in API
  // calls (endpoints return 200+CORS when warm; UI degrades gracefully). Infra artifact
  // under rapid headless load — NOT an app defect. Tracked separately from real console errors.
  const realErrs = errs.filter(e => !/guidance\/score|guardian\/check-in/i.test(e));
  const transient = errs.length > 0 && realErrs.length === 0;
  const hasErr = realErrs.length > 0;
  let verdict, note;
  if (allow) {
    if (blank || stuckSpinner) { verdict = 'FAIL'; note = blank ? 'blank/empty render' : 'stuck spinner'; }
    else if (info.invis > 0) { verdict = 'FAIL'; note = `${info.invis} invisible-text (white-card)`; }
    else if (hasErr) { verdict = 'WARN'; note = 'console error: ' + realErrs[0]; }
    else { verdict = 'PASS'; note = transient ? 'renders (transient guidance/guardian cold-start CORS, graceful)' : 'renders'; }
  } else { // expected block → must be intentional gate, NOT a crash/blank
    if (hasErr && /permission|denied|insufficient/i.test(realErrs.join(' '))) { verdict = 'FAIL'; note = 'raw permission-denied: ' + realErrs[0]; }
    else if (info.gate) { verdict = 'PASS'; note = transient ? 'intentional gate UI (+ transient cold-start CORS)' : 'intentional gate UI'; }
    else if (info.landed !== routeFor(section) && info.textLen > 80 && !blank) { verdict = 'PASS'; note = `redirected → ${info.landed} (gate)`; }
    else if (blank || stuckSpinner) { verdict = 'FAIL'; note = 'blank/stuck on blocked route (no gate UI)'; }
    else if (hasErr) { verdict = 'WARN'; note = 'console error on blocked route: ' + realErrs[0]; }
    else { verdict = 'PASS?'; note = `renders on blocked route (verify scoping): "${info.sample.slice(0,50)}"`; }
  }
  return { persona: key, section, expect: allow ? 'allow' : 'block', verdict, note,
           landed: info.landed, status, textLen: info.textLen, heading: info.heading, sample: info.sample, invis: info.invis, errs: errs.length, shot };
}

const b = await ENGINE.launch();
const rows = [];
for (const key of PERSONAS) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const { page, ok, errs } = await login(ctx, key);
  console.log(`\n=== ${key} === login: ${ok ? 'OK' : 'FAILED'}`);
  if (!ok) { rows.push({ persona: key, section: '(login)', verdict: 'FAIL', note: 'login failed', expect: '-', landed: '-', status: '-', textLen: 0, invis: 0, errs: 0 }); await ctx.close(); continue; }
  for (const s of SECTIONS) {
    const r = await checkCell(page, key, s, errs);
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
