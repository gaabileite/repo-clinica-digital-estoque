import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const collection = '**/api/v1/clinics/clinic-test/receipts?*';
const detail = '**/api/v1/clinics/clinic-test/receipts/note-1';
const baseNote = {
  id: 'note-1', number: 'NR-0001', origin: 'central-warehouse', receivedOn: '2026-11-24',
  reversedAt: null, lineCount: 1, hasDivergence: true,
};
const item = {
  id: 'line-1', item: { name: 'Luva', code: 'INS-0001', unit: 'cx' },
  orderedQuantity: '5.000', receivedQuantity: '3.000', lotCode: 'L-01', expiresOn: '2027-01-25',
};
const payload = { ...baseNote, orderedOn: '2026-11-20', description: null, donorLetterFileId: null,
  proofFileId: 'proof-1', reversalReason: null, lines: [item] };

async function session(page: Page, canReverse = true) {
  await page.route('**/api/v1/me/permissions', (route) => route.fulfill({ json: {
    profile: canReverse ? 'warehouse' : 'superuser',
    permissions: canReverse ? ['stock:read', 'stock:receive'] : ['stock:read'],
    clinics: ['clinic-test'],
  } }));
}

test('filtra por período e carrega a próxima página do servidor', async ({ page }) => {
  await session(page);
  await page.route(collection, (route) => {
    const query = new URL(route.request().url()).searchParams;
    const data = query.has('cursor') ? [{ ...baseNote, id: 'note-2', number: 'NR-0002' }] : [baseNote];
    return route.fulfill({ json: { data, page: { total: 2, nextCursor: query.has('cursor') ? null : 'next' } } });
  });
  await page.goto('/receipts');
  await expect(page.getByRole('rowheader', { name: 'NR-0001' })).toBeVisible();
  await page.getByLabel('Data inicial').fill('2026-11-01');
  await page.getByRole('combobox', { name: 'Origem' }).selectOption('central-warehouse');
  const request = page.waitForRequest((req) => req.url().includes('from=2026-11-01'));
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  expect(new URL((await request).url()).searchParams.get('origin')).toBe('central-warehouse');
  await page.getByRole('button', { name: 'Carregar mais notas' }).click();
  await expect(page.getByRole('rowheader', { name: 'NR-0002' })).toBeVisible();
});

test('mostra a divergência e restringe o estorno conforme o escopo', async ({ page }) => {
  await session(page, false);
  await page.route(collection, (route) => route.fulfill({ json: { data: [baseNote], page: { total: 1, nextCursor: null } } }));
  await page.route(detail, (route) => route.fulfill({ json: payload }));
  await page.goto('/receipts');
  await page.getByRole('button', { name: 'Ver nota NR-0001' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Divergência', { exact: true })).toBeVisible();
  await expect(dialog.getByText('25/01/2027')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Estornar nota' })).toHaveCount(0);
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});

test('reenvia com a mesma chave após falha e atualiza a lista após estorno', async ({ page }) => {
  await session(page);
  let reverseAt: string | null = null;
  const keys: string[] = [];
  await page.route(collection, (route) => route.fulfill({ json: { data: [{ ...baseNote, reversedAt: reverseAt }], page: { total: 1, nextCursor: null } } }));
  await page.route(detail, (route) => route.fulfill({ json: { ...payload, reversedAt: reverseAt } }));
  await page.route(detail + '/reversals', (route) => {
    expect(route.request().postDataJSON()).toEqual({ justification: 'Entrada incorreta' });
    keys.push(route.request().headers()['idempotency-key']);
    if (keys.length === 1) return route.fulfill({ status: 503, json: { detail: 'Serviço temporariamente indisponível.' } });
    reverseAt = '2026-11-24T21:00:00Z';
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto('/receipts');
  await page.getByRole('button', { name: 'Ver nota NR-0001' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Estornar nota' }).click();
  const reason = dialog.getByLabel('Justificativa do estorno');
  await reason.fill('Entrada incorreta');
  await dialog.getByRole('button', { name: 'Confirmar estorno' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Serviço temporariamente indisponível.');
  await expect(reason).toHaveValue('Entrada incorreta');
  await dialog.getByRole('button', { name: 'Confirmar estorno' }).click();
  await expect(page.getByRole('status')).toContainText('Nota estornada.');
  await expect(page.getByRole('cell', { name: 'Estornada', exact: true })).toBeVisible();
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(keys[0]).toBe(keys[1]);
});

test('exibe o motivo do 409 e mantém a nota aberta para consulta', async ({ page }) => {
  await session(page);
  await page.route(collection, (route) => route.fulfill({ json: {
    data: [baseNote], page: { total: 1, nextCursor: null },
  } }));
  await page.route(detail, (route) => route.fulfill({ json: payload }));
  await page.route(detail + '/reversals', (route) =>
    route.fulfill({ status: 409, json: { detail: 'O lote L-01 já foi movimentado.' } }),
  );
  await page.goto('/receipts');
  await page.getByRole('button', { name: 'Ver nota NR-0001' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Estornar nota' }).click();
  const reason = dialog.getByLabel('Justificativa do estorno');
  await reason.fill('Entrada incorreta');
  await dialog.getByRole('button', { name: 'Confirmar estorno' }).click();
  await expect(dialog.getByRole('alert')).toContainText('O lote L-01 já foi movimentado.');
  await expect(reason).toHaveValue('Entrada incorreta');
  await expect(dialog).toBeVisible();
});
