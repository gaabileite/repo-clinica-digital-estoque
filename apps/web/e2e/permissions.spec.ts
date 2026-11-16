import { expect, test } from '@playwright/test';
import type { MePermissions } from '../src/lib/me-permissions';

const permissionsUrl = '**/api/v1/me/permissions';
const warehouse: MePermissions = {
  profile: 'warehouse',
  permissions: ['stock:read'],
  clinics: ['clinic-test'],
};

test('espera as permissões antes de abrir a tela de estoque', async ({ page }) => {
  let sendResponse!: () => void;
  const response = new Promise<void>((resolve) => {
    sendResponse = resolve;
  });
  await page.route(permissionsUrl, async (route) => {
    await response;
    await route.fulfill({ json: warehouse });
  });

  try {
    await page.goto('/stock');
    await expect(page.getByRole('status')).toHaveText('Carregando permissões...');
  } finally {
    sendResponse();
  }

  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Relatórios', exact: true })).toHaveCount(0);
});

test('permite tentar novamente após falha ao consultar permissões', async ({ page }) => {
  await page.route(permissionsUrl, (route) => route.fulfill({ json: warehouse }));
  await page.route(permissionsUrl, (route) => route.fulfill({ status: 503 }), { times: 1 });

  await page.goto('/stock');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar as permissões');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
});

test('usa os escopos de orçamento para o perfil budget-controller', async ({ page }) => {
  const budgetController: MePermissions = {
    profile: 'budget-controller',
    permissions: ['stock:budget:read', 'stock:budget:cost:write'],
    clinics: ['clinic-test'],
  };
  await page.route(permissionsUrl, (route) => route.fulfill({ json: budgetController }));

  await page.goto('/budget');
  await expect(page.getByRole('heading', { name: 'Visão orçamentária', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Estoque', exact: true })).toHaveCount(0);

  await page.goto('/stock');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
});
