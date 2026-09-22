import { chromium } from 'playwright';
import assert from 'node:assert/strict';

async function testDesktopUx() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Desktop Test (1440px)
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktopPage.goto('http://localhost:5173/bundle', { waitUntil: 'domcontentloaded' });
  await desktopPage.evaluate(() => sessionStorage.clear());
  await desktopPage.reload({ waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(400);

  // 1.1 Verify initial state: 0 items -> summary panel is hidden completely
  const isHiddenInitially = await desktopPage.evaluate(() => {
    const summary = document.querySelector('.oak-bundle-summary');
    const layout = document.querySelector('.oak-bundle-layout');
    const root = document.querySelector('.oak-bundle');
    const style = window.getComputedStyle(summary);
    const layoutStyle = window.getComputedStyle(layout);
    return {
      hasSelectedClass: root.classList.contains('has-selected-items'),
      display: style.display,
      layoutColumns: layoutStyle.gridTemplateColumns
    };
  });
  console.log('Desktop 0 items check:', isHiddenInitially);
  assert.equal(isHiddenInitially.hasSelectedClass, false);
  assert.equal(isHiddenInitially.display, 'none');
  await desktopPage.screenshot({ path: 'qa/desktop-ux-0-items.png' });

  // 1.2 First product added -> panel appears
  const firstCard = desktopPage.locator('.oak-bundle-card:not([hidden])').nth(0);
  await firstCard.locator('[data-add]').click();
  await desktopPage.waitForTimeout(400);

  const afterFirstAdd = await desktopPage.evaluate(() => {
    const summary = document.querySelector('.oak-bundle-summary');
    const root = document.querySelector('.oak-bundle');
    const style = window.getComputedStyle(summary);
    return {
      hasSelectedClass: root.classList.contains('has-selected-items'),
      display: style.display,
      itemCount: root.querySelector('[data-unit-count]').textContent.trim()
    };
  });
  console.log('Desktop 1 item check:', afterFirstAdd);
  assert.equal(afterFirstAdd.hasSelectedClass, true);
  assert.notEqual(afterFirstAdd.display, 'none');
  assert.equal(afterFirstAdd.itemCount, '1 item');
  await desktopPage.screenshot({ path: 'qa/desktop-ux-1-item.png' });

  // 1.3 Second product added -> 10% tier
  const secondCard = desktopPage.locator('.oak-bundle-card:not([hidden])').nth(1);
  await secondCard.locator('[data-add]').click();
  await desktopPage.waitForTimeout(400);

  const tier2Text = await desktopPage.locator('[data-tier]').innerText();
  console.log('Desktop 2 items tier text:', tier2Text);
  assert.match(tier2Text, /10% OFF/);
  await desktopPage.screenshot({ path: 'qa/desktop-ux-2-items.png' });

  // 1.4 Third product added -> 15% tier
  const thirdCard = desktopPage.locator('.oak-bundle-card:not([hidden])').nth(2);
  await thirdCard.locator('[data-add]').click();
  await desktopPage.waitForTimeout(400);

  const tier3Text = await desktopPage.locator('[data-tier]').innerText();
  console.log('Desktop 3 items tier text:', tier3Text);
  assert.match(tier3Text, /15% OFF/);
  await desktopPage.screenshot({ path: 'qa/desktop-ux-3-items.png' });

  // 1.5 Remove all products -> panel hidden again
  while (await desktopPage.locator('[data-bundle-remove]').count() > 0) {
    await desktopPage.locator('[data-bundle-remove]').first().click();
    await desktopPage.waitForTimeout(300);
  }

  const isHiddenAfterRemoval = await desktopPage.evaluate(() => {
    const summary = document.querySelector('.oak-bundle-summary');
    const root = document.querySelector('.oak-bundle');
    const style = window.getComputedStyle(summary);
    return {
      hasSelectedClass: root.classList.contains('has-selected-items'),
      display: style.display
    };
  });
  console.log('Desktop after removing all check:', isHiddenAfterRemoval);
  assert.equal(isHiddenAfterRemoval.hasSelectedClass, false);
  assert.equal(isHiddenAfterRemoval.display, 'none');
  await desktopPage.screenshot({ path: 'qa/desktop-ux-removed-all.png' });
  await desktopPage.close();

  // 2. Mobile Verification (390px) - ensure mobile remains unchanged
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  await mobilePage.goto('http://localhost:5173/bundle', { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => sessionStorage.clear());
  await mobilePage.reload({ waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(400);

  const mobileCheck = await mobilePage.evaluate(() => {
    const summary = document.querySelector('.oak-bundle-summary');
    const jump = document.querySelector('.oak-bundle-jump');
    const summaryStyle = window.getComputedStyle(summary);
    const jumpStyle = window.getComputedStyle(jump);
    return {
      summaryDisplay: summaryStyle.display,
      jumpDisplay: jumpStyle.display,
      jumpSticky: jumpStyle.position
    };
  });
  console.log('Mobile check at 0 items:', mobileCheck);
  // On mobile, summary remains in document flow (not display: none) and jump bar is sticky
  assert.notEqual(mobileCheck.summaryDisplay, 'none');
  assert.equal(mobileCheck.jumpSticky, 'sticky');
  await mobilePage.screenshot({ path: 'qa/mobile-ux-unchanged-0-items.png' });
  await mobilePage.close();

  await browser.close();
  console.log('ALL DESKTOP & MOBILE UX CHECKS PASSED SUCCESSFULLY!');
}

testDesktopUx().catch(err => {
  console.error(err);
  process.exit(1);
});
