import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const demoUrl = '/reports?demo-relatorios=1';

async function reportSession(page: Page, profile = 'admin', permissions = ['stock:reports']) {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({
    json: { profile, permissions, clinics: ['clinic-test'] },
  }));
}

test('exibe consumo líquido e exige um insumo para agrupar por clínica ou semana', async ({ page }) => {
  await reportSession(page, 'superuser');
  await page.goto(demoUrl);
  await expect(page.getByText(/Dados de demonstração/)).toBeVisible();
  await page.getByLabel('Clínica', { exact: true }).selectOption('Clínica de Odontologia');
  await page.getByLabel('Categoria', { exact: true }).selectOption('Curativos');
  const gauze = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Gaze estéril' }) });
  await expect(gauze.getByRole('cell', { name: '70', exact: true })).toBeVisible();

  await page.getByLabel('Agrupar por', { exact: true }).selectOption('week');
  await expect(page.getByText('Selecione um insumo', { exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByLabel('Insumo', { exact: true }).selectOption('INS-0002');
  await expect(page.getByRole('table', { name: 'Consumo por semana' })).toBeVisible();
  await expect(page.getByRole('table').getByRole('cell', { name: 'pacote', exact: true }).first()).toBeVisible();
});

test('filtra perdas pelo período e calcula a classe ABC por unidade', async ({ page }) => {
  await reportSession(page);
  await page.goto(demoUrl);
  await page.getByRole('radio', { name: 'Perdas' }).check();
  await expect(page.getByText('Descarte por avaria')).toBeVisible();
  await page.getByLabel('Período').selectOption('7');
  await expect(page.getByText('Descarte por avaria')).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Validade', exact: true })).toBeVisible();

  await page.getByRole('radio', { name: 'Curva ABC' }).check();
  const gloves = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Luvas de procedimento' }) });
  await expect(gloves.getByRole('cell', { name: '100%', exact: true })).toBeVisible();
  const compress = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Compressa' }) });
  await expect(compress.getByRole('cell', { name: 'B', exact: true })).toBeVisible();
});

test('só mostra exemplos na execução isolada com a demonstração habilitada e acesso permitido', async ({ page }) => {
  await reportSession(page);
  await page.goto('/reports');
  await expect(page.getByText('Relatórios indisponíveis')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await reportSession(page, 'warehouse', ['stock:read']);
  await page.goto(demoUrl);
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

for (const dark of [false, true]) {
  test(`relatórios acessíveis no tema ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
    await reportSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(demoUrl);
    await page.getByRole('radio', { name: 'Perdas' }).check();
    await expect(page.getByRole('table')).toBeVisible();
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  });
}
