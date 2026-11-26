import { expect, test } from '@playwright/test';

const clinic = 'clinic-test';
const item = { id: 'item-test', code: 'INS-0001', name: 'Luva', unit: 'cx', active: true };
const lot = { id: 'lot-test', lotCode: 'L01', quantity: '5', expiresOn: '2027-12-01', usable: true, suggested: true };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({
    json: { profile: 'warehouse', permissions: ['stock:read', 'stock:withdraw'], clinics: [clinic] },
  }));
  await page.route('**/items?*', (route) => route.fulfill({ json: { data: [item], page: { nextCursor: null } } }));
  await page.route('**/items/item-test/lots', (route) => route.fulfill({ json: { data: [lot] } }));
  await page.route('**/items/item-test/availability?*', (route) => {
    const quantity = new URL(route.request().url()).searchParams.get('quantity') ?? '';
    return route.fulfill({ json: { requestedQuantity: quantity, usableBalance: '5', available: Number(quantity) <= 5, shortfall: '1',
      suggestedLot: lot, allocations: [{ lotId: lot.id, lotCode: lot.lotCode, quantity }] } });
  });
});

test('saída bloqueia saldo insuficiente e envia chave de idempotência', async ({ page }) => {
  await page.route('**/clinics/clinic-test/withdrawals', (route) => {
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toMatchObject({ code: item.code, quantity: '2', kind: 'consumption' });
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto('/withdrawals');
  await page.getByLabel('Código do insumo').fill(item.code);
  await page.getByLabel('Quantidade').fill('6');
  await expect(page.getByText('Saldo insuficiente.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar saída' })).toBeDisabled();
  await page.getByLabel('Quantidade').fill('2');
  await page.getByRole('button', { name: 'Confirmar saída' }).click();
  await expect(page.getByText('Saída registrada com sucesso.')).toBeVisible();
});

test('devolução para lote original envia os dados obrigatórios', async ({ page }) => {
  await page.route('**/clinics/clinic-test/returns', (route) => {
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toMatchObject({ code: item.code, quantity: '1', lotId: lot.id, returnedBy: 'Ana' });
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto('/returns');
  await page.getByLabel('Código do insumo').fill(item.code);
  await page.getByLabel('Quantidade').fill('1');
  await page.getByLabel('Lote original', { exact: true }).selectOption(lot.id);
  await page.getByLabel('Quem retirou e devolveu').fill('Ana');
  await page.getByRole('button', { name: 'Confirmar devolução' }).click();
  await expect(page.getByText('Devolução registrada com sucesso.')).toBeVisible();
});
