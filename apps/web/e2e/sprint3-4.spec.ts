import { expect, test } from '@playwright/test';

const clinic = 'clinic-test';
const item = { id: 'item-test', code: 'INS-0001', name: 'Luva', unit: 'cx', active: true, tracksLotAndExpiry: true };
const lot = { id: 'lot-test', lotCode: 'L01', quantity: '5', expiresOn: '2027-12-01', usable: true, suggested: true };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({ json: {
    profile: 'warehouse', permissions: ['stock:read', 'stock:receive', 'stock:withdraw'], clinics: [clinic],
  } }));
  await page.route('**/items?*', (route) => route.fulfill({ json: { data: [item], page: { nextCursor: null } } }));
  await page.route('**/items/item-test/lots', (route) => route.fulfill({ json: { data: [lot] } }));
  await page.route('**/items/item-test/availability?*', (route) => route.fulfill({ json: {
    usableBalance: '5', available: true, suggestedLot: lot, allocations: [{ lotId: lot.id, lotCode: lot.lotCode, quantity: '1' }],
    warnings: [{ code: 'QUANTITY_ABOVE_DAILY_AVERAGE', message: 'Quantidade acima da média diária.' }],
  } }));
});

test('entrada exige lote e validade e informa nota emitida', async ({ page }) => {
  await page.route('**/clinics/clinic-test/receipts*', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { data: [], page: { total: 0, nextCursor: null } } });
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toMatchObject({
      origin: 'central-warehouse', lines: [{ code: item.code, receivedQuantity: '2', lotCode: 'L02', expiresOn: '2027-12-01' }],
    });
    return route.fulfill({ status: 201, json: { number: 'NR-0001' } });
  });
  await page.goto('/receipts');
  const form = page.getByRole('region', { name: 'Nova entrada' });
  await form.getByLabel('Código do insumo').fill(item.code);
  await form.getByLabel('Quantidade recebida').fill('2');
  await expect(form.getByLabel('Lote', { exact: true })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Confirmar entrada' })).toBeDisabled();
  await form.getByLabel('Lote', { exact: true }).fill('L02');
  await form.getByLabel('Validade').fill('2027-12-01');
  await form.getByRole('button', { name: 'Confirmar entrada' }).click();
  await expect(form.getByText('Entrada registrada. Nota NR-0001.')).toBeVisible();
});

test('mostra avisos antes da saída e exige motivo para desfazer', async ({ page }) => {
  await page.route('**/clinics/clinic-test/withdrawals', (route) => route.fulfill({ status: 201, json: {
    movements: [{ id: 'movement-test', lot, quantity: '-1' }], warnings: [],
  } }));
  await page.route('**/movements/movement-test/reversals', (route) => {
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ reason: 'Registro incorreto' });
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto('/withdrawals');
  await page.getByLabel('Código do insumo').fill(item.code);
  await page.getByLabel('Quantidade').fill('1');
  await expect(page.getByText('Quantidade acima da média diária.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar saída' }).click();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmar estorno' })).toBeDisabled();
  await page.getByLabel('Motivo do estorno').fill('Registro incorreto');
  await page.getByRole('button', { name: 'Confirmar estorno' }).click();
  await expect(page.getByText('Todos os lançamentos desta saída foram estornados.')).toBeVisible();
});

test('painel de almoxarife não mostra movimentações nem consumo semanal', async ({ page }) => {
  await page.route('**/clinics/clinic-test/dashboard', (route) => route.fulfill({ json: {
    summary: { controlledItems: 7, criticalItems: 2, expiringItems: 3, itemsWithExpiredLots: 1 },
    criticalItems: [], expiringLots: [], expiredLots: [], recentMovements: [],
  } }));
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Itens controlados/ })).toContainText('7');
  await expect(page.getByRole('link', { name: /Itens a vencer/ })).toHaveAttribute('href', '/stock?clinic=clinic-test&expiry=expiring');
  await expect(page.getByRole('heading', { name: 'Últimas movimentações' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Consumo semanal' })).toHaveCount(0);
});
