import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const permissionsUrl = '**/api/v1/me/permissions';
const demoUrl = '/budget?demo-orcamento=1';

async function budgetSession(page: Page, profile = 'budget-controller') {
  await page.route(permissionsUrl, (route) => route.fulfill({
    json: { profile, permissions: ['stock:budget:read'], clinics: ['clinic-test'] },
  }));
}

test('demonstra valores em reais, busca por código e filtra a categoria', async ({ page }) => {
  await budgetSession(page);
  await page.goto(demoUrl);
  await expect(page.getByText('Dados de demonstração. Os valores são fictícios.')).toBeVisible();
  await expect(page.getByText(/R\$\s*2\.505,00/)).toBeVisible();
  await expect(page.getByRole('rowheader').first()).toHaveText(/Luvas de procedimento/);
  await page.getByLabel('Categoria', { exact: true }).selectOption('Curativos');
  await expect(page.getByRole('rowheader')).toHaveCount(2);
  const search = page.getByRole('searchbox', { name: 'Buscar insumo' });
  await search.fill('ins-0003');
  await expect(page.getByRole('rowheader')).toHaveText(/Gaze estéril/);
  await search.fill('inexistente');
  await expect(page.getByText('Nenhum insumo corresponde aos filtros')).toBeVisible();
});

test('isola a demonstração por perfil e pela opção na URL', async ({ page }) => {
  await budgetSession(page);
  await page.goto('/budget');
  await expect(page.getByText('Dados orçamentários indisponíveis')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await budgetSession(page, 'admin');
  await page.goto(demoUrl);
  await expect(page.getByText('Dados orçamentários indisponíveis')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

for (const dark of [false, true]) {
  test(`prévia orçamentária acessível no tema ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
    await budgetSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(demoUrl);
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
