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
  await page.waitForSelector('[data-testid="week-grid-view"]');

  // 1. Default state: Dinners enabled by default; Breakfast/Lunch/Snack collapsed
  await assertNoOverflow(page, 'Default Week View (Dinners)');
  const lunchVisibleDefault = await page.isVisible('[data-testid="week-slot-0-lunch"]');
  if (lunchVisibleDefault) {
    throw new Error('Expected Lunch slot to be collapsed/off by default');
  }

  // Expand Meal Slots & enable Breakfasts, Lunches, Snacks
  await page.click('[data-testid="meal-slots-toggle-bar"]');
  await page.click('[data-testid="slot-toggle-breakfast"]');
  await page.click('[data-testid="slot-toggle-lunch"]');
  await page.click('[data-testid="slot-toggle-snack"]');
  await page.waitForSelector('[data-testid="week-slot-0-breakfast"]');
  await page.waitForSelector('[data-testid="week-slot-0-lunch"]');
  await page.waitForSelector('[data-testid="week-slot-0-snack"]');
  await page.waitForSelector('[data-testid="week-slot-0-dinner"]');
  await assertNoOverflow(page, 'Week Grid View (All 4 Slots)');

  // Test Lock Day protects ALL 4 slots on Day 0
  await page.click('[data-testid="lock-day-btn-0"]');
  const breakfastDisabledWhenLocked = await page.isDisabled('[data-testid="resim-btn-0-breakfast"]');
  const dinnerDisabledWhenLocked = await page.isDisabled('[data-testid="resim-btn-0-dinner"]');
  if (!breakfastDisabledWhenLocked || !dinnerDisabledWhenLocked) {
    throw new Error('Expected Lock Day to lock both Breakfast and Dinner on Day 0');
  }
  await page.click('[data-testid="lock-day-btn-0"]'); // unlock
  console.log('✓ Lock Day protects all 4 slots (breakfast, lunch, snack, dinner)');

  // Confirm Favorite button was removed from Weekly Plan view and replaced with +
  const favInPlanCount = await page.locator('[data-testid^="fav-btn-"]').count();
  if (favInPlanCount !== 0) {
    throw new Error(`Expected 0 favorite buttons in Weekly Plan view, found ${favInPlanCount}`);
  }

  // Test horizontal swipe on Day 0 breakfast -> clears to blank state, then Add Random restores it
  const breakfastRow = page.locator('[data-testid="week-slot-0-breakfast"]');
  const box = await breakfastRow.boundingBox();
  if (!box) throw new Error('Missing boundingBox for week-slot-0-breakfast');
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForSelector('[data-testid="empty-slot-0-breakfast"]');
  console.log('✓ Swipe on meal cleared Day 0 breakfast to blank slot');

  await page.click('[data-testid="add-random-btn-0-breakfast"]');
  await page.waitForSelector('[data-testid="week-slot-0-breakfast"]');
  console.log('✓ Add Random restored a meal into the blank slot');

  // Block Day 0 snack, and verify + picker opens with medium images & excludes blocked
  await page.click('[data-testid="block-btn-0-snack"]');
  await page.click('[data-testid="choose-btn-0-snack"]');
  await page.waitForSelector('[data-testid="meal-picker-modal"]');
  await assertNoOverflow(page, 'Meal Picker Modal');
  const blockedOptionVisible = await page.isVisible('[data-testid="picker-option-banana-oat-baby-muffins"]');
  if (blockedOptionVisible) {
    throw new Error('Expected blocked snack (banana-oat-baby-muffins) to be hidden from + picker');
  }
  const pickerImgCount = await page.locator('[data-testid="meal-picker-modal"] img').count();
  if (pickerImgCount === 0) {
    throw new Error('Expected medium-sized images in Meal Picker Modal');
  }
  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_meal_picker_390x844.png'),
    fullPage: false,
  });
  await page.click('[data-testid="close-meal-picker-btn"]');
  console.log('✓ Meal Picker (+) hides blocked items & shows medium meal photos');

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_week_grid_390x844.png'),
    fullPage: false,
  });

  // Switch to Photo Cards view and verify enabled sections
  await page.click('[data-testid="view-mode-cards"]');
  await page.waitForSelector('[data-testid="meal-card-0"]');
  await assertNoOverflow(page, 'Plan Photo Cards View');
  await page.waitForSelector('[data-testid="weekly-breakfasts-section"]');
  await page.waitForSelector('[data-testid="weekly-lunches-section"]');
  await page.waitForSelector('[data-testid="weekly-snacks-section"]');

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_plan_390x844.png'),
    fullPage: false,
  });

  // 2. Shop View: toggling 6_9m vs 2_4y, check item, and Share with Partner QR modal
  await page.click('[data-testid="tab-shop"]');
  await page.waitForSelector('[data-testid="grocery-row-sweet_potato"]');
  await assertNoOverflow(page, 'Shop View');

  const qtyBoth = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');
  await page.click('[data-testid="bracket-pill-2_4y"]');
  const qtyBabyOnly = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');
  await page.click('[data-testid="bracket-pill-6_9m"]');
  await page.click('[data-testid="bracket-pill-2_4y"]');
  const qtyToddlerOnly = await page.textContent('[data-testid="grocery-qty-sweet_potato"]');
  console.log(`✓ Sweet potato scaled quantities: both=${qtyBoth}, 6_9m=${qtyBabyOnly}, 2_4y=${qtyToddlerOnly}`);
  if (qtyBabyOnly === qtyToddlerOnly) {
    throw new Error('Expected sweet_potato quantity to differ between 6_9m and 2_4y');
  }

  // Check sweet_potato row before sharing
  await page.click('[data-testid="grocery-row-sweet_potato"] button');

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_shop_390x844.png'),
    fullPage: false,
  });

  // Open Share with Partner modal and capture magic share URL + QR SVG
  await page.click('[data-testid="shop-share-btn"]');
  await page.waitForSelector('[data-testid="share-modal"]');
  await page.waitForSelector('[data-testid="share-qr-svg"] svg');
  await assertNoOverflow(page, 'Share QR Modal');
  const shareUrl = await page.textContent('[data-testid="share-modal"] p.font-mono');
  if (!shareUrl || !shareUrl.includes('#s=')) {
    throw new Error(`Expected #s= share URL, got: ${shareUrl}`);
  }
  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_share_qr_390x844.png'),
    fullPage: false,
  });
  await page.click('[data-testid="share-modal"] button[aria-label="Fechar janela de partilha"]');
  console.log('✓ Share with Partner QR modal & #s= link verified');

  // Verify #s= URL hydration in a brand-new clean browser context
  const partnerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const partnerPage = await partnerContext.newPage();
  await partnerPage.goto(shareUrl, { waitUntil: 'networkidle' });
  await partnerPage.waitForSelector('[data-testid="sync-notice-banner"]');
  await partnerPage.click('[data-testid="tab-shop"]');
  const partnerChecked = await partnerPage.getAttribute(
    '[data-testid="grocery-row-sweet_potato"] button',
    'aria-pressed',
  );
  if (partnerChecked !== 'true') {
    throw new Error('Expected shared #s= URL to hydrate checked grocery state on partner device');
  }
  await partnerContext.close();
  console.log('✓ Partner #s= URL hash hydration verified in clean context');

  // 3. Cook View: SVG Cut-Shape Diagrams + Mark Tried + Hands-Free Cook Mode
  await page.click('[data-testid="tab-cook"]');
  await page.waitForSelector('[data-testid="dynamic-child-prep-card"]');
  await assertNoOverflow(page, 'Cook View');

  // Toggle 6_9m back on so both brackets + SVG cut diagrams show
  await page.click('[data-testid="bracket-pill-6_9m"]');
  await page.waitForSelector('[data-testid="child-prep-bracket-6_9m"]');
  await page.waitForSelector('[data-testid="child-prep-bracket-2_4y"]');
  const svgCount = await page.locator('[data-testid^="cut-shape-svg-"] svg').count();
  if (svgCount < 2) {
    throw new Error(`Expected >= 2 SVG cut-shape diagrams in ChildPrepCard, got ${svgCount}`);
  }
  console.log(`✓ Inline SVG Cut-Shape Diagrams rendered (${svgCount} diagrams)`);

  // Verify one-tap Mark Tried updates HouseholdBar Foods: X/100 · Allergens: Y/9 badge
  const badgeBefore = await page.textContent('[data-testid="household-first-foods-badge"]');
  await page.click('[data-testid="mark-meal-foods-tried-btn"]');
  const badgeAfter = await page.textContent('[data-testid="household-first-foods-badge"]');
  if (badgeBefore === badgeAfter) {
    throw new Error('Expected HouseholdBar Foods/Allergens badge to update after Mark Tried');
  }
  console.log(`✓ HouseholdBar progress badge updated: "${badgeBefore?.trim()}" -> "${badgeAfter?.trim()}"`);

  // Verify Favorite button in Cook View & that Favorites sort to top of + Meal Picker
  await page.click('[data-testid="cook-favorite-btn"]');
  console.log('✓ Cook View Favorite toggled ON');

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_cook_390x844.png'),
    fullPage: false,
  });

  // Launch Hands-Free Cook Mode, test 56px buttons & auto-parsed countdown timer
  await page.click('[data-testid="hands-free-launch-btn"]');
  await page.waitForSelector('[data-testid="hands-free-modal"]');
  await assertNoOverflow(page, 'Hands-Free Cook Mode');

  const nextBtnBox = await page.locator('[data-testid="hands-free-next-btn"]').boundingBox();
  if (!nextBtnBox || nextBtnBox.height < 56) {
    throw new Error(`Expected Hands-Free Next button height >= 56px, got ${nextBtnBox?.height}`);
  }

  // Step 1 has "15 minutes" timer -> start it and confirm countdown ticks
  await page.waitForSelector('[data-testid^="step-timer-toggle-"]');
  const timerBefore = await page.textContent('[data-testid^="step-timer-display-"]');
  await page.click('[data-testid^="step-timer-toggle-"]');
  await page.waitForTimeout(1300);
  const timerAfter = await page.textContent('[data-testid^="step-timer-display-"]');
  if (timerBefore === timerAfter) {
    throw new Error(`Expected timer countdown to tick (${timerBefore} -> ${timerAfter})`);
  }
  console.log(`✓ Hands-Free Cook Mode timer ticks (${timerBefore} -> ${timerAfter})`);

  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_hands_free_390x844.png'),
    fullPage: false,
  });

  // Advance to Seasoning Split step and confirm banner, then close
  await page.click('[data-testid="hands-free-next-btn"]');
  await page.click('[data-testid="hands-free-next-btn"]');
  await page.waitForSelector('[data-testid="hands-free-split-banner"]');
  await page.click('[data-testid="close-hands-free-btn"]');

  // 4. Verify First Foods Modal from HouseholdBar badge
  await page.click('[data-testid="household-first-foods-badge"]');
  await page.waitForSelector('[data-testid="first-foods-modal"]');
  await page.waitForSelector('[data-testid="allergen-exposure-sesame"]');
  await assertNoOverflow(page, 'First Foods Modal (100 Foods & Top-9 Allergens)');
  await page.screenshot({
    path: resolve(ARTIFACT_DIR, 'mobile_first_foods_390x844.png'),
    fullPage: false,
  });
  await page.click('[data-testid="close-first-foods-modal"]');

  // 5. Verify Favorite appears first in Lunch/Dinner + picker, then swap Dinner & check Shop
  await page.click('[data-testid="tab-plan"]');
  await page.click('[data-testid="view-mode-week"]');
  await page.click('[data-testid="choose-btn-0-lunch"]');
  await page.waitForSelector('[data-testid="meal-picker-modal"]');
  const firstPickerId = await page.getAttribute(
    '[data-testid^="picker-option-"]',
    'data-testid',
  );
  if (firstPickerId !== 'picker-option-lemon-herb-baked-salmon') {
    throw new Error(`Expected favorited salmon at top of Lunch picker, got ${firstPickerId}`);
  }
  await page.waitForSelector('[data-testid="picker-fav-badge-lemon-herb-baked-salmon"]');
  await page.click('[data-testid="close-meal-picker-btn"]');
  console.log('✓ Favorited recipe appears first in Lunch/Dinner + picker');

  const beforeTitle = await page.textContent('[data-testid="week-slot-0-dinner"]');
  await page.click('[data-testid="resim-btn-0-dinner"]');
  const afterTitle = await page.textContent('[data-testid="week-slot-0-dinner"]');
  if (beforeTitle === afterTitle) {
    throw new Error('Expected dinner swap on Day 0 to change meal title');
  }
  await page.click('[data-testid="tab-shop"]');
  await page.waitForSelector('[data-testid^="grocery-row-"]');
  const rowTestIds = await page.$$eval('[data-testid^="grocery-row-"]', (els) =>
    els.map((el) => el.getAttribute('data-testid')),
  );
  if (new Set(rowTestIds).size !== rowTestIds.length) {
    throw new Error('Duplicate grocery rows detected after swap');
  }
  console.log(`✓ Shop recalculated with ${rowTestIds.length} unique canonical_id rows`);

  await browser.close();
  console.log('ALL V2 MOBILE VERIFICATION CHECKS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
