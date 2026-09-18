import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('Testing Desktop 1440px...');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Verify account icon exists
  const accountIcon = page.locator('.header__icon--account').first();
  await accountIcon.waitFor({ state: 'visible' });

  // Click account icon to open modal
  await accountIcon.click();
  await page.waitForTimeout(500);

  // Check overlay visibility
  const overlay = page.locator('#oak-login-modal-overlay');
  const isVisible = await overlay.evaluate(el => el.classList.contains('active'));
  console.log('Modal opened (active class present):', isVisible);

  // Check body overflow
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  console.log('Body overflow is:', bodyOverflow);

  // Take desktop modal screenshot
  await page.screenshot({ path: 'qa/local-modal-desktop.png' });
  console.log('Saved qa/local-modal-desktop.png');

  // Test carousel dots
  const dot3 = page.locator('.oak-modal-dot[data-slide="2"]');
  await dot3.click();
  const slide3Title = await page.locator('.oak-modal-card-title').textContent();
  console.log('Slide 3 title after click:', slide3Title);

  const dot2 = page.locator('.oak-modal-dot[data-slide="1"]');
  await dot2.click();
  const slide2Title = await page.locator('.oak-modal-card-title').textContent();
  console.log('Slide 2 title after click:', slide2Title);

  // Test phone input
  const phoneInput = page.locator('#oak-modal-phone-input');
  await phoneInput.fill('9876543210');
  console.log('Phone input value:', await phoneInput.inputValue());

  // Test submit
  const submitBtn = page.locator('#oak-modal-submit-btn');
  await submitBtn.click();
  await page.waitForTimeout(700);
  const feedbackMsg = await page.locator('#oak-modal-feedback').textContent();
  console.log('Feedback after submit:', feedbackMsg);

  // Test close button
  const closeBtn = page.locator('#oak-modal-close-btn');
  await closeBtn.click();
  await page.waitForTimeout(300);
  const isVisibleAfterClose = await overlay.evaluate(el => el.classList.contains('active'));
  console.log('Modal closed via close button:', !isVisibleAfterClose);
  console.log('Body overflow restored:', await page.evaluate(() => document.body.style.overflow));

  // Test Escape key
  await accountIcon.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const isVisibleAfterEsc = await overlay.evaluate(el => el.classList.contains('active'));
  console.log('Modal closed via Escape key:', !isVisibleAfterEsc);

  // Test click overlay backdrop
  await accountIcon.click();
  await page.waitForTimeout(300);
  // Click in top left corner outside modal
  await page.mouse.click(50, 50);
  await page.waitForTimeout(300);
  const isVisibleAfterBackdrop = await overlay.evaluate(el => el.classList.contains('active'));
  console.log('Modal closed via backdrop click:', !isVisibleAfterBackdrop);

  // Now test Mobile 390px
  console.log('\nTesting Mobile 390px...');
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1000);

  const mobileAccountIcon = mobilePage.locator('.header__icon--account').first();
  await mobileAccountIcon.waitFor({ state: 'visible' });
  await mobileAccountIcon.click();
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({ path: 'qa/local-modal-mobile.png' });
  console.log('Saved qa/local-modal-mobile.png');

  await browser.close();
  console.log('All tests finished successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
