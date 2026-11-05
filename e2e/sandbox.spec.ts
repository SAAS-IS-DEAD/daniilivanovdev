import { test, expect } from '@playwright/test';

test('embedded Apollo Sandbox loads schema and executes a public query', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const query =
    'query SandboxSmoke { profile { name description skills { name } experience { company position } projects { name } } }';
  const expected = await (await request.post('/graphql', { data: { query } })).json();
  expect(expected.errors).toBeUndefined();
  expect(expected.data.profile).not.toBeNull();
  await page.goto('/graphql', { waitUntil: 'domcontentloaded' });
  const sandbox = page.frameLocator('iframe[src*="sandbox.embed.apollographql.com"]');
  await expect(sandbox.getByRole('heading', { name: 'Documentation' })).toBeVisible({
    timeout: 60000,
  });
  const editor = sandbox
    .getByRole('textbox', { name: 'Editor content;Press Alt+F1 for Accessibility Options.' })
    .first();
  await editor.press('ControlOrMeta+A');
  await editor.fill(query);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/graphql') && r.request().postData()?.includes('SandboxSmoke') === true,
  );
  await sandbox.getByRole('button', { name: 'SandboxSmoke', exact: true }).click();
  expect(await (await response).json()).toEqual(expected);
  await expect(
    sandbox.getByText(expected.data.profile.name, { exact: false }).last(),
  ).toBeVisible();
});
