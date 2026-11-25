import { describe, expect, it } from 'vitest';
import type { ItemBalanceDto, LotDto } from '@/lib/api-client/models';
import { mapBalancePage, mapStockItem, mapStockLot } from './api';

const balance: ItemBalanceDto = {
  itemId: 'insumo-1',
  code: 'INS-0001',
  name: 'Gaze estéril',
  categoryId: 'categoria-1',
  categoryName: 'Curativos',
  unit: 'cx',
  tracksLotAndExpiry: true,
  recordsTemperature: false,
  active: true,
  balance: '12.500',
  usableBalance: '10.250',
  expiredQuantity: '2.250',
  expiredLots: 1,
  expiringLots: 1,
  nearestExpiry: {
    lotId: 'lote-1',
    lotCode: 'LOTE-01',
    expiresOn: '2026-12-03',
    daysToExpiry: 14,
    status: 'expiring',
  },
  avgDailyConsumption: '0.500',
  coverageDays: 20.5,
  leadTimeDays: 7,
  leadTimeSource: 'estimated',
  criticalLevel: 6,
  situation: 'reorder',
  expiryAlertLeadDays: 30,
};

describe('consulta de estoque: contrato da API', () => {
  it('lê a validade aninhada, situação e decimais do saldo', () => {
    expect(mapStockItem(balance)).toMatchObject({
      id: 'insumo-1',
      code: 'INS-0001',
      categoryId: 'categoria-1',
      category: 'Curativos',
      balance: 12.5,
      usable: 10.25,
      expiry: '2026-12-03',
      expiryStatus: 'expiring',
      expiredLots: 1,
      expiringLots: 1,
      critical: 6,
      coverage: 20.5,
      status: 'reorder',
    });
  });

  it('representa insumo sem vencimento e sem consumo', () => {
    const item = mapStockItem({
      ...balance, nearestExpiry: null, expiredLots: 0, expiringLots: 0,
      coverageDays: null, criticalLevel: 0, situation: 'adequate',
    });
    expect(item.expiry).toBeNull();
    expect(item.expiryStatus).toBeNull();
    expect(item.coverage).toBeNull();
    expect(item.critical).toBe(0);
  });

  it('preserva paginação do backend (N resultados de M insumos)', () => {
    const result = mapBalancePage({
      data: [balance],
      page: { nextCursor: 'proxima-pagina', total: 7, totalInClinic: 25 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.page).toEqual({ nextCursor: 'proxima-pagina', total: 7, totalInClinic: 25 });
  });

  it('mapeia código, validade e a indicação FEFO dos lotes', () => {
    const lot: LotDto = {
      id: 'lote-1', lotCode: 'LOTE-01', expiresOn: '2026-12-03',
      quantity: '3.125', status: 'expiring', daysToExpiry: 14,
      usable: true, suggested: true,
    };
    expect(mapStockLot(lot)).toEqual({
      id: 'lote-1', code: 'LOTE-01', expiry: '2026-12-03',
      balance: 3.125, status: 'expiring', usable: true, suggested: true,
    });
  });

  it('mantém lotes vencidos não utilizáveis e lotes sem validade', () => {
    const expired: LotDto = {
      id: 'lote-2', lotCode: 'VENCIDO', expiresOn: '2026-01-01',
      quantity: '2.000', status: 'expired', daysToExpiry: -10,
      usable: false, suggested: false,
    };
    expect(mapStockLot(expired).usable).toBe(false);
    expect(mapStockLot({ ...expired, status: 'no-expiry', expiresOn: null, usable: true }).expiry).toBeNull();
  });
});
