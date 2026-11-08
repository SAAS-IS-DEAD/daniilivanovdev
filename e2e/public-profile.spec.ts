import { test, expect } from '@playwright/test';
for (const width of [360, 1440]) {
  test(`guided profile at ${width}px, touch selection and keyboard`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { data } = await (
      await request.post('/graphql', {
        data: { query: '{profile{name description experience{id company} skills{name}}}' },
      })
    ).json();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(data.profile.name);
    await expect(
      page.getByRole('img', { name: 'Пиксельный персонаж в очках и чёрной куртке' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Места работы/ }).click();
    const company = page
      .getByRole('button', { name: new RegExp(data.profile.experience[0].company) })
      .first();
    await company.focus();
    await expect(page.getByRole('status')).toContainText(data.profile.experience[0].company);
    await company.press('Enter');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      data.profile.experience[0].company,
    );
    await page.getByRole('button', { name: /К списку/ }).click();
    await page.getByRole('button', { name: 'Навыки', exact: true }).click();
    await page.getByRole('textbox', { name: 'Найти навык' }).fill('TypeScript');
    await expect(page.getByRole('button', { name: 'TypeScript', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Найти навык' }).fill('нет-такого-навыка');
    await expect(page.getByText(/Ничего не нашлось/)).toBeVisible();
    await page.getByRole('button', { name: 'Начало', exact: true }).click();
    await page.getByRole('button', { name: /Обо мне/ }).click();
    await expect(page.getByText(data.profile.description, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Куда отправимся?');
  });
}

test('hover narration, sprite animation and explicit pause', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Опыт', exact: true }).click();
  await page.getByRole('button', { name: /Lofty/ }).hover();
  await expect(page.getByRole('status')).toContainText('Lofty');
  const sprite = page.locator('.character-sprite');
  await expect(sprite).toHaveAttribute('data-pose', 'talk');
  const first = await sprite.getAttribute('data-frame');
  await expect.poll(() => sprite.getAttribute('data-frame')).not.toBe(first);
  await page.getByRole('button', { name: /Выключить анимацию/ }).click();
  await expect(sprite).toHaveAttribute('data-frame', '0');
  await page.getByRole('button', { name: 'Помахать', exact: true }).click();
  await expect(sprite).toHaveAttribute('data-pose', 'wave');
  await expect(page.getByRole('status')).toContainText('Привет-привет');
});

test('reduced motion keeps the sprite still and speech immediately readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const sprite = page.locator('.character-sprite');
  await expect(sprite).toHaveAttribute('data-frame', '0');
  await expect(page.getByRole('button', { name: '▶ Анимация выключена' })).toBeDisabled();
  await expect(page.locator('.dialogue p')).toContainText('Выбирай, что интересно');
});

test('SPA refresh works while API routes stay outside the fallback', async ({ request }) => {
  expect((await request.get('/admin/projects')).status()).toBe(200);
  const missing = await request.get('/health/unknown', { headers: { Accept: 'text/html' } });
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('application/json');
  expect((await request.get('/assets/missing.js')).status()).toBe(404);
});

test.describe('touch navigation', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  test('touch opens stories without hiding the heading or back button behind the guide', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Места работы/ }).tap();
    await page.getByRole('button', { name: /Lofty/ }).tap();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Lofty');
    const guide = await page
      .getByRole('complementary', { name: 'Пиксельный проводник' })
      .boundingBox();
    const back = await page.getByRole('button', { name: /К списку/ }).boundingBox();
    expect(back!.y).toBeGreaterThanOrEqual(guide!.y + guide!.height);
    await page.getByRole('button', { name: /К списку/ }).tap();
    await page.getByRole('button', { name: 'Проекты', exact: true }).tap();
    await page.getByRole('button', { name: /Kupikod/ }).tap();
    await expect(page.getByRole('link', { name: 'Открыть проект' })).toHaveAttribute(
      'href',
      'https://kupikod.com/',
    );
    await page.getByRole('button', { name: 'Связаться', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Начнём разговор' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'dr.dany@yandex.ru' })).toHaveAttribute(
      'href',
      'mailto:dr.dany@yandex.ru',
    );
  });
});

test('character sprites use compact fingerprinted WebP assets with immutable cache and matching preload', async ({
  page,
  request,
}) => {
  const images: string[] = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'image') images.push(req.url());
  });
  await page.goto('/');
  const sprite = page.locator('.character-sprite');
  const background = await sprite.evaluate((element) => getComputedStyle(element).backgroundImage);
  const url = background.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  expect(url).toMatch(/\/assets\/character-sprites-[\w-]+\.webp$/);
  const response = await request.get(url!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/webp');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect((await response.body()).length).toBeLessThan(400_000);
  expect(
    await page
      .locator('link[rel="preload"][as="image"]')
      .evaluate((el) => (el as HTMLLinkElement).href),
  ).toBe(url);
  await expect.poll(() => images.filter((image) => image === url).length).toBe(1);
  expect(images.some((image) => image.endsWith('/images/character-sprites.png'))).toBe(false);
  expect(
    await sprite.evaluate(async (element) => {
      const image = new Image();
      image.src = getComputedStyle(element).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)![1];
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }),
  ).toEqual([1246, 1263]);
});

test('gaming animation and paused sprite use fingerprinted cacheable assets', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Навыки', exact: true }).click();
  const gif = page.locator('.character-gaming');
  await expect(gif).toBeVisible();
  const gifUrl = await gif.getAttribute('src');
  expect(gifUrl).toMatch(/\/assets\/character-gaming-[\w-]+\.gif$/);
  const animation = await request.get(gifUrl!);
  expect(animation.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  await page.getByRole('button', { name: /Выключить анимацию/ }).click();
  const still = page.locator('.character-gaming-still');
  const background = await still.evaluate((element) => getComputedStyle(element).backgroundImage);
  const url = background.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  expect(url).toMatch(/\/assets\/character-gaming-sprites-[\w-]+\.webp$/);
  const response = await request.get(url!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/webp');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect((await response.body()).length).toBeLessThan(600_000);
  expect(
    await still.evaluate(async (element) => {
      const image = new Image();
      image.src = getComputedStyle(element).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)![1];
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }),
  ).toEqual([1774, 887]);
});
