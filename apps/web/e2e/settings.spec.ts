import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const initial = {
  safetyMarginPercent: 20,
  highWithdrawalMultiplier: 3,
  consumptionDropPercent: 50,
  incorrectReceiptDeadlineDays: 45,
};
const initialRoles = [
  { role: 'superuser', permissions: ['stock:admin'] },
  { role: 'warehouse', permissions: ['stock:read', 'stock:withdraw', 'stock:reverse'] },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({
    json: { profile: 'superuser', permissions: ['stock:admin'], clinics: [] },
  }));
  await page.route('**/api/v1/settings', (route) => route.fulfill({ json: initial }));
  await page.route('**/api/v1/roles', (route) => route.fulfill({ json: initialRoles }));
});

test('salva apenas os parâmetros alterados e mantém a edição em caso de erro', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/settings', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: initial });
    expect(route.request().postDataJSON()).toEqual({ safetyMarginPercent: 25 });
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 422, json: { detail: 'Confira o parâmetro.' } });
    return route.fulfill({ json: { ...initial, safetyMarginPercent: 25 } });
  });
  await page.goto('/settings');
  const margin = page.getByLabel('Margem de segurança (%)');
  const save = page.getByRole('button', { name: 'Salvar parâmetros' });
  await expect(margin).toHaveValue('20');
  await margin.fill('25');
  await save.click();
  await expect(page.getByRole('alert')).toHaveText('Confira o parâmetro.');
  await expect(margin).toHaveValue('25');
  await save.click();
  await expect(page.getByText('Parâmetros salvos.')).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(margin).toHaveValue('25');
});

test('edita as permissões de um perfil e protege o acesso do Superuser à configuração', async ({ page }) => {
  const submitted: unknown[] = [];
  await page.route('**/api/v1/roles/warehouse/permissions', (route) => {
    const request = route.request();
    expect(request.method()).toBe('PUT');
    const body = request.postDataJSON();
    submitted.push(body);
    return route.fulfill({ json: { role: 'warehouse', permissions: body.permissions } });
  });
  await page.goto('/settings');
  await expect(page.getByLabel('Gerenciar configurações')).toBeDisabled();
  await expect(page.getByLabel('Gerenciar configurações')).toBeChecked();
  await page.getByLabel('Perfil', { exact: true }).selectOption('warehouse');
  await page.getByLabel('Estornar saídas de outros usuários').uncheck();
  await page.getByRole('button', { name: 'Salvar permissões' }).click();
  await expect(page.getByText('Permissões de Almoxarife salvas.')).toBeVisible();
  expect(submitted).toEqual([{ permissions: ['stock:read', 'stock:withdraw'] }]);
});

test('restringe Configurações a Superuser mesmo quando outro perfil recebe stock:admin', async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({
    json: { profile: 'admin', permissions: ['stock:admin'], clinics: [] },
  }));
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Configurações' })).toHaveCount(0);
});

for (const dark of [false, true]) {
  test(`Configurações acessíveis no tema ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Salvar parâmetros' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar permissões' })).toBeVisible();
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
