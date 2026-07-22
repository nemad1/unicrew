/**
 * QA Screenshot Capture Script
 *
 * Run with: node scripts/qa-screenshots.js
 * Requires the dev server running at http://localhost:3000 and the
 * test accounts created by backend/scripts/seed-qa.js.
 *
 * Logs in as each test account, visits its key screens, and saves a
 * full-page screenshot per screen under qa-screenshots/<role>/<screen>.png.
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '..', '..', 'qa-screenshots');
const PASSWORD = 'TestPass123!';

const ROLES = [
  {
    slug: 'admin',
    email: 'test.admin@test.local',
    screens: [
      { name: 'dashboard', path: '/admin' },
      { name: 'user-management', path: '/admin/users' },
      { name: 'ai-intent-router', path: '/admin/intent-router' },
      { name: 'inbox', path: '/inbox' },
    ],
  },
  {
    slug: 'counselor',
    email: 'test.counselor@test.local',
    screens: [
      { name: 'inbox', path: '/inbox' },
      { name: 'kanban', path: '/kanban' },
      { name: 'analytics', path: '/analytics' },
      { name: 'calendar', path: '/calendar' },
    ],
  },
  {
    slug: 'ambassador',
    email: 'test.ambassador@test.local',
    screens: [
      { name: 'inbox', path: '/inbox' },
      { name: 'kanban', path: '/kanban' },
      { name: 'peer-directory', path: '/peers' },
      { name: 'calendar', path: '/calendar' },
    ],
  },
];

async function login(page, email) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  // Let the dashboard's client-side profile fetch settle.
  await page.waitForTimeout(1500);
}

async function captureSharedScreens(browser) {
  const dir = path.join(OUT_DIR, 'shared');
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'landing.png'), fullPage: true });
  console.log('  - shared/landing.png');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'login.png'), fullPage: true });
  console.log('  - shared/login.png');

  await page.close();
}

// Personal /inbox is live: it polls /api/whatsapp/status until the
// account's linked WhatsApp session reports CONNECTED, then loads real
// chats from OpenWA. Give that handshake extra time before giving up.
async function waitForInboxReady(page) {
  await page
    .waitForSelector('div.w-\\[360px\\] button, text=Connect WhatsApp', { timeout: 25000 })
    .catch(() => {});
}

// Contacts we know are "saved" in the CRM (see backend/scripts/seed-qa.js
// REAL_CONTACT_ENRICHMENT) and have AI-profile data worth showing off,
// preferred over WhatsApp's own "status" broadcast row or unmatched numbers.
const PREFERRED_CONTACT_NAMES = ['Basem Customer', 'Elyas Ebrahim', 'Krishang', 'Sofia', 'Sharbin Samad'];

// After the inbox screen loads, try to open a known, CRM-saved conversation
// and its "View Profile" panel so we get one contact-profile screenshot per
// role that actually has AI-analysis data to show (not the "status" row).
async function captureInboxDetail(page, dir) {
  const chatListScope = page.locator('div.w-\\[360px\\]');
  let target = null;
  for (const name of PREFERRED_CONTACT_NAMES) {
    const candidate = chatListScope.getByText(name, { exact: false }).first();
    if (await candidate.count().then((n) => n > 0).catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) {
    // Fall back to the first real conversation row, skipping the "My
    // Chats"/"Team Overview" toggle buttons which also live in this div.
    const rows = chatListScope.locator('button:has(p)');
    if (await rows.count().then((n) => n > 0).catch(() => false)) {
      target = rows.first();
    }
  }
  if (!target) {
    console.log('  ! no conversations available to open (WhatsApp not connected / no chats yet)');
    return;
  }

  await target.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(dir, 'inbox-chat-open.png'), fullPage: true });
  console.log(`  - ${path.basename(dir)}/inbox-chat-open.png`);

  const viewProfileButton = page.getByText('View Profile', { exact: false }).first();
  const hasProfileButton = await viewProfileButton.count().then((n) => n > 0).catch(() => false);
  if (!hasProfileButton) {
    console.log('  ! "View Profile" button not found');
    return;
  }

  await viewProfileButton.click();
  await page
    .waitForSelector('text=AI Context Summary', { timeout: 10000 })
    .catch(() => console.log('  ! profile did not finish loading within 10s, screenshotting anyway'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, 'contact-profile.png'), fullPage: true });
  console.log(`  - ${path.basename(dir)}/contact-profile.png`);
}

async function captureRole(browser, role) {
  console.log(`\n${role.slug}`);
  const dir = path.join(OUT_DIR, role.slug);
  fs.mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page, role.email);
  } catch (err) {
    console.error(`  x login failed for ${role.email}: ${err.message}`);
    await context.close();
    return [];
  }

  const results = [];
  for (const screen of role.screens) {
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 20000 });
      if (screen.name === 'inbox') await waitForInboxReady(page);
      await page.waitForTimeout(1000);
      const filePath = path.join(dir, `${screen.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      results.push({ screen: screen.name, path: filePath, ok: true });
      console.log(`  - ${role.slug}/${screen.name}.png`);

      if (screen.name === 'inbox') {
        await captureInboxDetail(page, dir);
      }
    } catch (err) {
      results.push({ screen: screen.name, path: null, ok: false, reason: err.message });
      console.error(`  x ${screen.name}: ${err.message}`);
    }
  }

  await context.close();
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const summary = {};
  await captureSharedScreens(browser);

  for (const role of ROLES) {
    summary[role.slug] = await captureRole(browser, role);
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('Screenshot capture summary');
  console.log('='.repeat(60));
  for (const [slug, results] of Object.entries(summary)) {
    for (const r of results) {
      console.log(`${slug.padEnd(11)} ${r.screen.padEnd(20)} ${r.ok ? 'OK' : 'FAILED: ' + r.reason}`);
    }
  }
  console.log(`\nOutput dir: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
