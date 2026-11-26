import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { Movement } from '../src/features/movements/model';

const clinicId = '02a48e15-987b-40b1-8494-f641cbe40802';
const itemId = 'e453d80d-503a-4009-8d15-6b86b5b85b61';
const lotId = 'a047002f-f371-4574-8ad0-fbe37c8dccaa';
const movement: Movement = {
  id: 'm1', occurredAt: '2026-11-25T02:30:00Z', kind: 'consumption',
  item: { id: itemId, code: 'INS-0001', name: 'Luva', unit: 'cx', categoryName: 'EPI' },
  lot: { id: lotId, lotCode: 'LOTE-A', expiresOn: '2027-01-02' },
  quantity: '-2.125', userId: 'justino-dev', userName: 'Justino',
  reason: 'Procedimento', recipient: null, returnedBy: null, origin: 'manual',
  reversalOfId: null, reversedById: null,
};
const lotList = {
  item: { ...movement.item, expiryAlertLeadDays: 30 },
  data: [{ id: lotId, lotCode: 'LOTE-A', expiresOn: '2027-01-02', quantity: '10.000', status: 'valid', daysToExpiry: 38, usable: true, suggested: true }],
};
const movementsUrl = `**/api/v1/clinics/${clinicId}/movements?*`;
const adjustmentUrl = `**/api/v1/clinics/${clinicId}/lots/${lotId}/adjustments`;
const response = (data = [movement], nextCursor: string | null = null, total = data.length) => ({ data, page: { total, nextCursor } });

async function session(page: Page, permissions = ['stock:read', 'stock:adjust'], clinics = [clinicId]) {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({ json: { profile: 'admin', permissions, clinics } }));
}

test.beforeEach(async ({ page }) => {
  await session(page);
  await page.route(movementsUrl, (route) => route.fulfill({ json: response() }));
  await page.route(`**/api/v1/clinics/${clinicId}/items?*`, (route) => route.fulfill({ json: {
    data: [{ ...movement.item, active: true }], page: { nextCursor: null, total: 1 },
  } }));
  await page.route(`**/api/v1/clinics/${clinicId}/items/${itemId}/lots`, (route) => route.fulfill({ json: lotList }));
});

async function openAdjustment(page: Page) {
  await page.getByRole('button', { name: 'Ajustar inventário', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Insumo', { exact: true }).selectOption(itemId);
  await dialog.getByLabel('Lote', { exact: true }).selectOption(lotId);
  return dialog;
}

test('exibe dados históricos, sinal, fuso, autoria e vínculos de estorno', async ({ page }) => {
  await page.route(movementsUrl, (route) => route.fulfill({ json: response([
    { ...movement, reversedById: 'm2' },
    { ...movement, id: 'm2', kind: 'reversal', quantity: '2.125', reversalOfId: 'm1', reason: 'Engano' },
  ]) }));
  await page.goto('/movements');
  await expect(page.getByRole('cell', { name: '−2,125 cx', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '+2,125 cx', exact: true })).toBeVisible();
  await expect(page.getByText('Estornada', { exact: true })).toBeVisible();
  await expect(page.getByText('Estorno de: m1', { exact: true })).toBeVisible();
  await expect(page.locator('time').first()).toContainText('24/11/2026');
  await expect(page.locator('time').first()).toContainText('23:30');
  await expect(page.getByText('02/01/2027', { exact: true }).first()).toBeVisible();
});

test('filtra no servidor e reinicia o cursor ao mudar a consulta', async ({ page }) => {
  const requests: URLSearchParams[] = [];
  await page.route(movementsUrl, (route) => {
    const query = new URL(route.request().url()).searchParams;
    requests.push(query);
    if (query.has('code')) return route.fulfill({ json: response([]) });
    return route.fulfill({ json: query.has('cursor') ? response([{ ...movement, id: 'm2' }], null, 2) : response([movement], 'cursor-2', 2) });
  });
  await page.goto('/movements');
  await page.getByRole('button', { name: 'Carregar mais movimentações' }).click();
  await expect(page.getByText('Exibindo 2 de 2 movimentação(ões)', { exact: true })).toBeVisible();
  await page.getByLabel('Código do insumo').fill('INS-0020');
  await page.getByLabel('Categoria da movimentação').selectOption('loan');
  await page.getByLabel('ID do usuário').fill('usuario-x');
  await page.getByLabel('Lote', { exact: true }).fill('LOTE B');
  await page.getByLabel('Data inicial').fill('2026-11-01');
  await page.getByLabel('Data final').fill('2026-11-24');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText('Nenhuma movimentação encontrada', { exact: true })).toBeVisible();
  expect(Object.fromEntries(requests.at(-1)!)).toEqual({ limit: '50', code: 'INS-0020', kind: 'loan', userId: 'usuario-x', lot: 'LOTE B', from: '2026-11-01', to: '2026-11-24' });
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' }).first()).toBeVisible();
  await expect(page.getByLabel('Código do insumo')).toHaveValue('');
});

test('recusa período invertido sem enviar consulta inválida', async ({ page }) => {
  let invalidCalls = 0;
  await page.route(movementsUrl, (route) => {
    if (new URL(route.request().url()).searchParams.has('from')) invalidCalls += 1;
    return route.fulfill({ json: response() });
  });
  await page.goto('/movements');
  await page.getByLabel('Data inicial').fill('2026-11-25');
  await page.getByLabel('Data final').fill('2026-11-01');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('alert')).toContainText('data inicial');
  expect(invalidCalls).toBe(0);
});

test('preserva a primeira página após falha na segunda e permite repetir', async ({ page }) => {
  let attempts = 0;
  await page.route(movementsUrl, (route) => {
    if (new URL(route.request().url()).searchParams.has('cursor')) {
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 503, json: {} });
      return route.fulfill({ json: response([{ ...movement, id: 'm2' }], null, 2) });
    }
    return route.fulfill({ json: response([movement], 'cursor-2', 2) });
  });
  await page.goto('/movements');
  await page.getByRole('button', { name: 'Carregar mais movimentações' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Exibindo 2 de 2 movimentação(ões)', { exact: true })).toBeVisible();
});

test('trata serviço ainda indisponível e consegue recarregar', async ({ page }) => {
  await page.route(movementsUrl, (route) => route.fulfill({ status: 501, json: {} }), { times: 1 });
  await page.goto('/movements');
  await expect(page.getByRole('alert')).toContainText('ainda não está disponível');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' })).toBeVisible();
});

test('trocar clínica remove linhas, filtros e formulários da anterior', async ({ page }) => {
  await session(page, ['stock:read', 'stock:adjust'], [clinicId, 'other-clinic']);
  await page.route('**/api/v1/clinics/other-clinic/movements?*', (route) => route.fulfill({ json: response([]) }));
  await page.goto('/movements');
  await page.getByLabel('Código do insumo').fill('INS-0011');
  await page.getByRole('button', { name: 'Ajustar inventário', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Clínica', { exact: true }).selectOption('other-clinic');
  await expect(page.getByText('Nenhuma movimentação encontrada', { exact: true })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' })).toHaveCount(0);
  await expect(page.getByLabel('Código do insumo')).toHaveValue('');
});

test('sem clínica não consulta dados e sem permissão não oferece ajuste', async ({ page }) => {
  let calls = 0;
  await session(page, ['stock:read'], []);
  await page.route(movementsUrl, (route) => { calls += 1; return route.fulfill({ json: response() }); });
  await page.goto('/movements');
  await expect(page.getByText('Clínica não selecionada', { exact: true })).toBeVisible();
  expect(calls).toBe(0);
  await session(page, ['stock:read']);
  await page.reload();
  await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajustar inventário' })).toHaveCount(0);
});

test('ajuste aceita zero, exige justificativa e envia Idempotency-Key', async ({ page }) => {
  let body: unknown;
  let key: string | undefined;
  await page.route(adjustmentUrl, (route) => {
    body = route.request().postDataJSON(); key = route.request().headers()['idempotency-key'];
    return route.fulfill({ status: 201, json: { movementId: 'adj1', itemId, lotId, previousQuantity: '10.000', countedQuantity: '0.000', difference: '-10.000' } });
  });
  await page.goto('/movements');
  const dialog = await openAdjustment(page);
  await dialog.getByLabel('Quantidade contada', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Confirmar ajuste' }).click();
  await expect(dialog.getByRole('alert')).toContainText('justificativa');
  expect(body).toBeUndefined();
  await dialog.getByLabel('Justificativa', { exact: true }).fill(' Contagem física ');
  await dialog.getByRole('button', { name: 'Confirmar ajuste' }).click();
  await expect(page.getByRole('status')).toContainText('Diferença registrada: −10,000 cx');
  expect(body).toEqual({ countedQuantity: '0.000', justification: 'Contagem física' });
  expect(key).toMatch(/^[0-9a-f-]{36}$/);
});

test('reenvio após erro conserva chave e dados; editar o corpo gera outra chave', async ({ page }) => {
  const keys: string[] = [];
  await page.route(adjustmentUrl, (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto('/movements');
  const dialog = await openAdjustment(page);
  await dialog.getByLabel('Quantidade contada', { exact: true }).fill('1,234');
  await dialog.getByLabel('Justificativa', { exact: true }).fill('Contagem');
  const submit = dialog.getByRole('button', { name: 'Confirmar ajuste' });
  await submit.click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await submit.click();
  await expect.poll(() => keys.length).toBe(2);
  await expect(submit).toBeEnabled();
  expect(keys[0]).toBe(keys[1]);
  await expect(dialog.getByLabel('Quantidade contada', { exact: true })).toHaveValue('1,234');
  await dialog.getByLabel('Justificativa', { exact: true }).fill('Nova contagem');
  await submit.click();
  await expect.poll(() => keys.length).toBe(3);
  expect(keys[2]).not.toBe(keys[0]);
});

test('ajuste sem diferença informa que não criou movimentação', async ({ page }) => {
  await page.route(adjustmentUrl, (route) => route.fulfill({ status: 201, json: { movementId: null, itemId, lotId, previousQuantity: '10.000', countedQuantity: '10.000', difference: '0.000' } }));
  await page.goto('/movements');
  const dialog = await openAdjustment(page);
  await dialog.getByLabel('Quantidade contada', { exact: true }).fill('10');
  await dialog.getByLabel('Justificativa', { exact: true }).fill('Contagem');
  await dialog.getByRole('button', { name: 'Confirmar ajuste' }).click();
  await expect(page.getByRole('status')).toContainText('Nenhuma movimentação foi criada');
});

for (const dark of [false, true]) {
  test(`acessibilidade da tabela, do ajuste e do estorno no tema ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
    await session(page, ['stock:read', 'stock:adjust', 'stock:withdraw', 'stock:reverse']);
    await page.goto('/movements');
    await expect(page.getByRole('rowheader', { name: 'Luva INS-0001' })).toBeVisible();
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    const scan = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect((await scan()).violations).toEqual([]);
    await openAdjustment(page);
    expect((await scan()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Ajustar inventário', exact: true })).toBeFocused();
    const reverse = page.getByRole('button', { name: 'Estornar', exact: true });
    await reverse.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Estornar movimentação' })).toBeVisible();
    expect((await scan()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(reverse).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('estorna uma saída, conserva o motivo e a chave no reenvio, e atualiza o histórico', async ({ page }) => {
  await session(page, ['stock:read', 'stock:withdraw', 'stock:reverse']);
  const reversalUrl = `**/api/v1/clinics/${clinicId}/movements/m1/reversals`;
  const keys: string[] = [];
  let recorded = false;

  await page.route(movementsUrl, (route) => route.fulfill({ json: response(recorded ? [
    { ...movement, id: 'm2', kind: 'reversal', quantity: '2.125', reason: 'Contagem incorreta', reversalOfId: 'm1' },
    { ...movement, reversedById: 'm2' },
  ] : [movement, { ...movement, id: 'entry', kind: 'entry', quantity: '1.000' }]) }));
  await page.route(reversalUrl, (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.postDataJSON()).toEqual({ reason: 'Contagem incorreta' });
    keys.push(request.headers()['idempotency-key']);
    if (keys.length === 1) return route.fulfill({ status: 503, json: { detail: 'Serviço ocupado. Tente novamente.' } });
    recorded = true;
    return route.fulfill({ status: 201, json: { id: 'm2', kind: 'reversal', reversalOfId: 'm1' } });
  });
  await page.goto('/movements');
  const action = page.getByRole('button', { name: 'Estornar', exact: true });
  await expect(action).toHaveCount(1);
  await action.click();
  const dialog = page.getByRole('dialog', { name: 'Estornar movimentação' });
  const reason = dialog.getByLabel('Motivo do estorno');
  const confirm = dialog.getByRole('button', { name: 'Confirmar estorno' });
  await confirm.click();
  expect(keys).toEqual([]);
  await reason.fill('Contagem incorreta');
  await confirm.click();
  await expect(dialog.getByRole('alert')).toHaveText('Serviço ocupado. Tente novamente.');
  await expect(reason).toHaveValue('Contagem incorreta');
  await confirm.click();
  await expect(page.getByText('Estorno registrado no histórico.')).toBeFocused();
  await expect(page.getByText('Estornada', { exact: true })).toBeVisible();
  await expect(action).toHaveCount(0);
  expect(keys[0]).toBeTruthy();
  expect(keys).toEqual([keys[0], keys[0]]);
});

test('estorno conserva o formulário e explica a recusa por autoria', async ({ page }) => {
  await session(page, ['stock:read', 'stock:withdraw']);
  await page.route(`**/api/v1/clinics/${clinicId}/movements/m1/reversals`, (route) => route.fulfill({
    status: 403, json: { detail: 'Você só pode estornar a sua própria saída.' },
  }));
  await page.goto('/movements');
  await page.getByRole('button', { name: 'Estornar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Estornar movimentação' });
  await expect(dialog.getByText(/próprias saídas em até 24 horas/)).toBeVisible();
  await dialog.getByLabel('Motivo do estorno').fill('Correção');
  await dialog.getByRole('button', { name: 'Confirmar estorno' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Você só pode estornar a sua própria saída.');
  await expect(dialog.getByLabel('Motivo do estorno')).toHaveValue('Correção');
});
