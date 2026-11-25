import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: 'Painel' },
  { path: '/registrations', heading: 'Cadastros' },
  { path: '/stock', heading: 'Acesso restrito' },
];

for (const dark of [false, true]) {
  const theme = dark ? 'escuro' : 'claro';

  for (const screen of pages) {
    test(`${screen.heading} — tema ${theme}`, async ({ page }) => {

      const isRegistrations = screen.path === '/registrations';

      await page.route('**/api/v1/me/permissions', (route) =>
        route.fulfill({
          json: {
            profile: isRegistrations ? 'admin' : 'warehouse',
            permissions: isRegistrations ? ['stock:read', 'stock:catalog:write'] : [],
            clinics: ['clinic-test'],
          },
        }),
      );

      if (isRegistrations) {
        await page.route('**/api/v1/clinics/clinic-test/items?*', (route) =>
          route.fulfill({ json: { data: [], page: { total: 0, nextCursor: null } } }),
        );
        await page.route('**/api/v1/clinics/clinic-test/item-categories', (route) =>
          route.fulfill({ json: { data: [] } }),
        );
      }

      await page.goto(screen.path);

      await expect(
        page.getByRole('heading', {
          name: screen.heading,
          exact: true,
        }),
      ).toBeVisible();

      if (isRegistrations) {
        await expect(page.getByText('Nenhum insumo encontrado', { exact: true })).toBeVisible();
      }

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
