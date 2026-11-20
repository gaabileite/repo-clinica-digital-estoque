import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const clinicId = '02a48e15-987b-40b1-8494-f641cbe40802';
const categoryId = '5bc4971a-bc22-4ffb-b2a5-e79b7834fd2e';
const itemId = 'e453d80d-503a-4009-8d15-6b86b5b85b61';
const categories = [{ id: categoryId, name: 'EPI', active: true, activeItemCount: 1 }];
const item = {
  id: itemId,
  code: 'INS-0001',
  name: 'Luva de procedimento M',
  categoryId,
  unit: 'cx',
  tracksLotAndExpiry: true,
  expiryAlertLeadDays: 30,
  estimatedLeadTimeDays: 7,
  recordsTemperature: false,
  active: true,
};

async function prepareCatalog(page: Page) {
  await page.route('**/api/v1/me/permissions', (route) =>
    route.fulfill({
      json: {
        profile: 'admin',
        permissions: ['stock:read', 'stock:catalog:write'],
        clinics: [clinicId],
      },
    }),
  );
  await page.route('**/api/v1/catalog/units', (route) => route.fulfill({ json: ['cx', 'un', 'frasco'] }));
  await page.route(`**/api/v1/clinics/${clinicId}/item-categories`, (route) =>
    route.fulfill({ json: { data: categories } }),
  );
  await page.route(`**/api/v1/clinics/${clinicId}/items?*`, (route) =>
    route.fulfill({
      json: { data: [item], page: { nextCursor: null, total: 1 } },
    }),
  );
  await page.route(`**/api/v1/clinics/${clinicId}/items/${itemId}`, (route) =>
    route.fulfill({ headers: { ETag: '"1"' }, json: item }),
  );
}

test.beforeEach(async ({ page }) => {
  await prepareCatalog(page);
});

test('cria insumo com validação e código gerado pelo servidor', async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/clinics/${clinicId}/items`, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { ...item, ...body } });
  });
  await page.goto('/registrations');
  await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo insumo', exact: true });
  await expect(dialog.getByLabel('Controlar lote e validade')).toBeChecked();
  await dialog.getByRole('button', { name: 'Salvar insumo', exact: true }).click();
  await expect(dialog.getByText('Informe o nome do insumo.', { exact: true })).toBeVisible();
  expect(body).toBeUndefined();
  await dialog.getByLabel('Nome do insumo', { exact: false }).fill('Gaze estéril');
  await dialog.getByLabel('Categoria', { exact: false }).selectOption(categoryId);
  await dialog.getByLabel('Unidade de medida', { exact: false }).selectOption('cx');
  await dialog.getByLabel('Registrar temperatura de armazenamento').check();
  await dialog.getByLabel('Temperatura de armazenamento *', { exact: true }).fill('Refrigerado (2–8 °C)');
  await dialog.getByRole('button', { name: 'Salvar insumo', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Insumo salvo.');
  expect(body).toMatchObject({
    name: 'Gaze estéril',
    categoryId,
    unit: 'cx',
    recordsTemperature: true,
    temperatureRange: 'Refrigerado (2–8 °C)',
    estimatedLeadTimeDays: 7,
    expiryAlertLeadDays: 30,
  });
  expect(body).not.toHaveProperty('code');
});

test('editar envia If-Match e mantém os dados ao receber conflito 412', async ({ page }) => {
  let patch: { body: unknown; version: string | undefined } | undefined;
  await page.route(`**/api/v1/clinics/${clinicId}/items/${itemId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      patch = {
        body: route.request().postDataJSON(),
        version: route.request().headers()['if-match'],
      };
      return route.fulfill({
        status: 412,
        json: { detail: 'Versão desatualizada.' },
      });
    }
    return route.fulfill({ headers: { ETag: '"1"' }, json: item });
  });
  await page.goto('/registrations');
  await page.getByRole('button', { name: `Editar ${item.name}`, exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Editar insumo',
    exact: true,
  });
  await dialog.getByLabel('Nome do insumo', { exact: false }).fill('Nome alterado');
  await dialog.getByRole('button', { name: 'Salvar insumo' }).click();
  await expect(dialog.getByRole('alert')).toContainText('alterado por outra pessoa');
  await expect(dialog.getByLabel('Nome do insumo', { exact: false })).toHaveValue('Nome alterado');
  expect(patch?.version).toBe('"1"');
  expect(patch?.body).not.toHaveProperty('code');
  await expect(dialog.getByRole('button', { name: 'Salvar insumo' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Recarregar dados' }).click();
  await expect(page.getByRole('dialog').getByLabel('Nome do insumo', { exact: false })).toHaveValue(
    item.name,
  );
});

test('inativação exige confirmação e preserva a tela quando o servidor recusa', async ({ page }) => {
  let calls = 0;
  await page.route(`**/api/v1/clinics/${clinicId}/items/${itemId}/deactivate`, async (route) => {
    calls += 1;
    await route.fulfill({
      status: 422,
      json: { detail: 'O insumo ainda possui saldo.' },
    });
  });
  await page.goto('/registrations');
  await page.getByRole('button', { name: `Inativar ${item.name}`, exact: true }).click();
  expect(calls).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Inativar insumo', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('O insumo ainda possui saldo.');
  expect(calls).toBe(1);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('button', { name: `Inativar ${item.name}`, exact: true })).toBeVisible();
});

test('categorias validam nome duplicado e bloqueiam inativação com insumos ativos', async ({ page }) => {
  await page.goto('/registrations');
  await page.getByRole('tab', { name: 'Categorias', exact: true }).click();
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da categoria', { exact: false }).fill(' epi ');
  await dialog.getByRole('button', { name: 'Salvar categoria' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Já existe uma categoria');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Inativar EPI', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('1 insumo(s) ativo(s)');
  await expect(dialog.getByRole('button', { name: 'Inativar categoria' })).toBeDisabled();
});

test('cria, renomeia e reativa categorias atualizando a lista', async ({ page }) => {
  let stored = [...categories, { id: 'old', name: 'Antiga', active: false, activeItemCount: 0 }];
  await page.route(`**/api/v1/clinics/${clinicId}/item-categories`, async (route) => {
    if (route.request().method() === 'POST')
      stored.push({
        id: 'new',
        name: route.request().postDataJSON().name,
        active: true,
        activeItemCount: 0,
      });
    await route.fulfill({ json: { data: stored } });
  });
  await page.route(`**/api/v1/clinics/${clinicId}/item-categories/*`, async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    const changes = route.request().postDataJSON();
    stored = stored.map((category) => (category.id === id ? { ...category, ...changes } : category));
    await route.fulfill({ json: {} });
  });
  await page.goto('/registrations');
  await page.getByRole('tab', { name: 'Categorias', exact: true }).click();
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nome da categoria', { exact: false }).fill('Descartáveis');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar categoria' }).click();
  await expect(page.getByRole('rowheader', { name: 'Descartáveis' })).toBeVisible();
  await page.getByRole('button', { name: 'Renomear EPI' }).click();
  await page.getByRole('dialog').getByLabel('Nome da categoria', { exact: false }).fill('Proteção');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar categoria' }).click();
  await expect(page.getByRole('rowheader', { name: 'Proteção' })).toBeVisible();
  await page.getByRole('button', { name: 'Reativar Antiga' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar categoria' }).click();
  await expect(page.getByRole('row', { name: /Antiga/ }).getByText('Ativo', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Insumos', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Proteção', exact: true })).toBeVisible();
});

test('mostra validação por campo vinda da API', async ({ page }) => {
  await page.route(`**/api/v1/clinics/${clinicId}/items`, (route) =>
    route.fulfill({
      status: 422,
      json: {
        detail: 'Revise o nome informado.',
        errors: { name: ['Este nome já está cadastrado.'] },
      },
    }),
  );
  await page.goto('/registrations');
  await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do insumo', { exact: false }).fill('Duplicado');
  await dialog.getByLabel('Categoria', { exact: false }).selectOption(categoryId);
  await dialog.getByLabel('Unidade de medida', { exact: false }).selectOption('cx');
  await dialog.getByRole('button', { name: 'Salvar insumo' }).click();
  await expect(dialog.getByText('Este nome já está cadastrado.', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Nome do insumo', { exact: false })).toHaveAttribute('aria-invalid', 'true');
});

test('API indisponível apresenta mensagem e permite tentar novamente', async ({ page }) => {
  await page.route(
    `**/api/v1/clinics/${clinicId}/items?*`,
    (route) => route.fulfill({ status: 501, json: {} }),
    { times: 1 },
  );
  await page.goto('/registrations');
  await expect(page.getByRole('alert')).toContainText('ainda está em implementação');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('cell', { name: 'Luva de procedimento M INS-0001' })).toBeVisible();
});

test('filtra insumos e carrega páginas sem misturar resultados', async ({ page }) => {
  await page.route(`**/api/v1/clinics/${clinicId}/items?*`, (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get('q') === 'vazio')
      return route.fulfill({
        json: { data: [], page: { total: 0, nextCursor: null } },
      });
    const second = query.has('cursor');
    return route.fulfill({
      json: {
        data: [second ? { ...item, id: 'second', code: 'INS-0002', name: 'Máscara' } : item],
        page: { total: 2, nextCursor: second ? null : 'page-2' },
      },
    });
  });
  await page.goto('/registrations');
  await page.getByRole('button', { name: 'Carregar mais insumos' }).click();
  await expect(page.getByText('Exibindo 2 de 2 insumo(s)', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Nome ou código').fill('vazio');
  await expect(page.getByText('Nenhum insumo encontrado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Luva de procedimento M INS-0001' })).toBeVisible();
});

test('trocar clínica usa somente os dados da nova clínica', async ({ page }) => {
  await page.route('**/api/v1/me/permissions', (route) =>
    route.fulfill({
      json: {
        profile: 'admin',
        permissions: ['stock:read', 'stock:catalog:write'],
        clinics: [clinicId, 'other-clinic'],
      },
    }),
  );
  await page.route('**/api/v1/clinics/other-clinic/item-categories', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/clinics/other-clinic/items?*', (route) =>
    route.fulfill({ json: { data: [], page: { nextCursor: null } } }),
  );
  await page.goto('/registrations');
  await expect(page.getByRole('cell', { name: 'Luva de procedimento M INS-0001' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Clínica', exact: true }).selectOption('other-clinic');
  await expect(page.getByText('Nenhum insumo encontrado', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Luva de procedimento M INS-0001' })).toHaveCount(0);
});

test('Controlador não recebe os formulários do catálogo operacional', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/v1/me/permissions', (route) =>
    route.fulfill({
      json: {
        profile: 'budget-controller',
        permissions: ['stock:budget:read', 'stock:budget:cost:write'],
        clinics: [clinicId],
      },
    }),
  );
  await page.route(`**/api/v1/clinics/${clinicId}/items?*`, async (route) => {
    calls += 1;
    await route.fulfill({ json: { data: [] } });
  });
  await page.goto('/registrations');
  await expect(page.getByRole('heading', { name: 'Cadastros', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo insumo' })).toHaveCount(0);
  expect(calls).toBe(0);
});

for (const dark of [false, true]) {
  test(`cadastros e formulário acessíveis no tema ${dark ? 'escuro' : 'claro'}`, async ({ page }) => {
    await page.goto('/registrations');
    await expect(page.getByRole('cell', { name: 'Luva de procedimento M INS-0001' })).toBeVisible();
    await page.evaluate((enabled) => {
      document.documentElement.classList.toggle('dark', enabled);
    }, dark);
    const analyze = () =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect((await analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Novo insumo', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Novo insumo', exact: true })).toBeFocused();
  });
}
