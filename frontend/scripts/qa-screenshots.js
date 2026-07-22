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

async function captureLoginScreen(browser) {
  const dir = path.join(OUT_DIR, 'shared');
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'login.png'), fullPage: true });
  await page.close();
  console.log('  - shared/login.png');
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
      await page.waitForTimeout(1000);
      const filePath = path.join(dir, `${screen.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      results.push({ screen: screen.name, path: filePath, ok: true });
      console.log(`  - ${role.slug}/${screen.name}.png`);
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
  await captureLoginScreen(browser);

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
