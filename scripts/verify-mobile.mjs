import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/6bf7b954-c975-4317-9fc0-9be306d1dc28';

const URL = process.env.APP_URL || 'http://127.0.0.1:4173';

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function assertNoOverflow(page, label) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (scrollWidth > clientWidth) {
    throw new Error(
      `Horizontal overflow on ${label}: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`,
    );
  }
  console.log(`✓ Zero horizontal overflow on ${label} (${scrollWidth} <= ${clientWidth})`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('pageerror', (err) => {
    console.error('Page error:', err);
    process.exitCode = 1;
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="meal-card-0"]');

  // 1. Plan view screenshot & overflow check
  await assertNoOverflow(page, 'Plan View');
  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_plan_390x844.png'),
    fullPage: false,
  });

  // 2. Check Shop view & toggling 6_9m vs 2_4y
  await page.click('[data-testid="tab-shop"]');
  await page.waitForSelector('[data-testid="grocery-row-sweet_potato"]');
  await assertNoOverflow(page, 'Shop View');

  // Record initial sweet_potato qty with both 6_9m and 2_4y active (default)
  const qtyBoth = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');

  // Toggle off 2_4y (leaving only 6_9m) -> quantity should drop
  await page.click('[data-testid="bracket-pill-2_4y"]');
  const qtyBabyOnly = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');

  // Toggle off 6_9m and toggle on 2_4y -> quantity should increase vs 6_9m only
  await page.click('[data-testid="bracket-pill-6_9m"]');
  await page.click('[data-testid="bracket-pill-2_4y"]');
  const qtyToddlerOnly = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');

  console.log(
    `✓ Sweet potato scaled quantities: both=${qtyBoth}, 6_9m=${qtyBabyOnly}, 2_4y=${qtyToddlerOnly}`,
  );
  if (qtyBabyOnly === qtyToddlerOnly) {
    throw new Error('Expected sweet_potato quantity to differ between 6_9m and 2_4y');
  }

  // Screenshot Shop view
  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_shop_390x844.png'),
    fullPage: false,
  });

  // 3. Verify Cook View Dynamic Child Prep Card updates with brackets
  await page.click('[data-testid="tab-cook"]');
  await page.waitForSelector('[data-testid="dynamic-child-prep-card"]');
  await assertNoOverflow(page, 'Cook View');

  const hasToddlerCard = await page.isVisible('[data-testid="child-prep-bracket-2_4y"]');
  const hasBabyCard = await page.isVisible('[data-testid="child-prep-bracket-6_9m"]');
  if (!hasToddlerCard || hasBabyCard) {
    throw new Error(
      `Expected only 2_4y prep card visible, got 2_4y=${hasToddlerCard}, 6_9m=${hasBabyCard}`,
    );
  }

  // Toggle 6_9m back on -> both prep cards visible
  await page.click('[data-testid="bracket-pill-6_9m"]');
  const hasBabyCardNow = await page.isVisible('[data-testid="child-prep-bracket-6_9m"]');
  if (!hasBabyCardNow) {
    throw new Error('Expected 6_9m prep card to appear when 6_9m bracket toggled on');
  }
  console.log('✓ Dynamic Child Prep Card updates live when toggling 6_9m vs 2_4y');

  // Verify seasoning split banner is visible
  const hasSplitBanner = await page.isVisible('[data-testid="seasoning-split-banner"]');
  if (!hasSplitBanner) {
    throw new Error('Expected seasoning split banner to be visible on Cook View');
  }

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_cook_390x844.png'),
    fullPage: false,
  });

  // 4. Swap a meal on Plan tab and verify Shop recalculates with zero duplicate canonical_id rows
  await page.click('[data-testid="tab-plan"]');
  await page.waitForSelector('[data-testid="swap-btn-0"]');
  const beforeTitle = await page.textContent('[data-testid="meal-card-0"] h2');
  await page.click('[data-testid="swap-btn-0"]');
  const afterTitle = await page.textContent('[data-testid="meal-card-0"] h2');
  if (beforeTitle === afterTitle) {
    throw new Error('Expected meal swap on Day 0 to change meal title');
  }
  console.log(`✓ Swapped Day 0 meal: "${beforeTitle}" -> "${afterTitle}"`);

  await page.click('[data-testid="tab-shop"]');
  await page.waitForSelector('[data-testid^="grocery-row-"]');
  const rowTestIds = await page.$$eval('[data-testid^="grocery-row-"]', (els) =>
    els.map((el) => el.getAttribute('data-testid')),
  );
  const uniqueIds = new Set(rowTestIds);
  if (uniqueIds.size !== rowTestIds.length) {
    throw new Error(`Duplicate grocery rows detected after swap: ${rowTestIds.length} vs ${uniqueIds.size}`);
  }
  console.log(`✓ Shop recalculated with ${rowTestIds.length} unique canonical_id rows`);

  await browser.close();
  console.log('ALL MOBILE VERIFICATION CHECKS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
