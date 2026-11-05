import { expect, test } from '@playwright/test';
test('skill arcade: mouse, collisions, leave-to-pause, keyboard and skill list', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Навыки', exact: true }).click();
  const board = page.getByRole('group', { name: 'Арканоид навыков' });
  await board.scrollIntoViewIfNeeded();
  const box = (await board.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.8);
  expect(Number(await page.getByTestId('skill-paddle').getAttribute('x'))).toBeCloseTo(304, 0);
  await board.click({ position: { x: box.width * 0.6, y: box.height * 0.8 } });
  await expect(page.locator('.breaker-brick')).toHaveCount(11, { timeout: 6000 });
  await page.mouse.move(0, 0);
  const ballY = await page.getByTestId('skill-ball').getAttribute('cy');
  await page.waitForTimeout(200);
  await expect(page.getByTestId('skill-ball')).toHaveAttribute('cy', ballY!);
  await board.click({ position: { x: box.width * 0.6, y: box.height * 0.8 } });
  const paddleX = await page.getByTestId('skill-paddle').getAttribute('x');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowLeft');
  expect(await page.getByTestId('skill-paddle').getAttribute('x')).not.toBe(paddleX);
  await expect(page.getByRole('textbox', { name: 'Найти навык' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Запустить шарик' })).toHaveCount(0);
});
test('touch drag moves the paddle without scrolling the page', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Навыки', exact: true }).tap();
  const board = page.getByRole('group', { name: 'Арканоид навыков' });
  await board.scrollIntoViewIfNeeded();
  const box = (await board.boundingBox())!;
  const scroll = await page.evaluate(() => window.scrollY);
  const session = await context.newCDPSession(page);
  const y = box.y + box.height * 0.8;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.3, y }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + box.width * 0.7, y }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await page.getByTestId('skill-paddle').getAttribute('x'))).toBeCloseTo(364, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.breaker-overlay strong')).toHaveText('Пауза');
  await context.close();
});
