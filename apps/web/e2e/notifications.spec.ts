import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const permissionsUrl = '**/api/v1/me/permissions';
const warehouse = {
  profile: 'warehouse',
  permissions: ['stock:read'],
  clinics: ['clinic-test'],
};

test('abre pelo sino, atualiza o contador e mantém o foco ao marcar a leitura', async ({ page }) => {
  await page.route(permissionsUrl, (route) => route.fulfill({ json: warehouse }));
  await page.goto('/?demo-notificacoes=1');

  const bell = page.getByRole('button', { name: 'Notificações: 2 não lidas' });
  await bell.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Notificações', exact: true })).toBeVisible();
  await expect(page.getByText('Dados de demonstração.', { exact: false })).toBeVisible();

  const read = page.getByRole('button', { name: 'Marcar como lida: Estoque em nível crítico' });
  await read.focus();
  await page.keyboard.press('Enter');
  const unread = page.getByRole('button', { name: 'Marcar como não lida: Estoque em nível crítico' });
  await expect(unread).toBeFocused();
  await expect(page.getByRole('button', { name: 'Notificações: 1 não lida' })).toBeVisible();

  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }

  await page.keyboard.press('Enter');
  await expect(bell).toBeVisible();
});

test('oculta o sino na visão orçamentária e restringe o acesso do controlador', async ({ page }) => {
  await page.route(permissionsUrl, (route) => route.fulfill({ json: {
    profile: 'superuser',
    permissions: ['stock:read', 'stock:budget:read'],
    clinics: [],
  } }));
  await page.goto('/budget?demo-notificacoes=1');
  await expect(page.getByRole('heading', { name: 'Visão orçamentária', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Notificações/ })).toHaveCount(0);

  await page.route(permissionsUrl, (route) => route.fulfill({ json: {
    profile: 'budget-controller',
    permissions: ['stock:read', 'stock:budget:read'],
    clinics: ['clinic-test'],
  } }));
  await page.goto('/notifications?demo-notificacoes=1');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Notificações/ })).toHaveCount(0);
});

test('informa que a caixa está indisponível sem a demonstração ou um adaptador', async ({ page }) => {
  await page.route(permissionsUrl, (route) => route.fulfill({ json: warehouse }));
  await page.goto('/notifications');
  await expect(page.getByText('Caixa de entrada indisponível')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Alertas de estoque' })).toHaveCount(0);
});
