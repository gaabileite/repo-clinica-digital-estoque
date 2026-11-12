import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) =>
    route.fulfill({ json: { profile: 'warehouse', permissions: [], clinics: ['clinic-test'] } }),
  );
});

const pages = [
  { path: '/', heading: 'Painel' },
  { path: '/registrations', heading: 'Cadastros' },
  { path: '/stock', heading: 'Acesso restrito' },
];

for (const dark of [false, true]) {
  const theme = dark ? 'escuro' : 'claro';

  for (const screen of pages) {
    test(`${screen.heading} — tema ${theme}`, async ({ page }) => {
      await page.goto(screen.path);

      await expect(
        page.getByRole('heading', {
          name: screen.heading,
          exact: true,
        }),
      ).toBeVisible();

      await page.evaluate((enabled) => {
        document.documentElement.classList.toggle('dark', enabled);
      }, dark);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
