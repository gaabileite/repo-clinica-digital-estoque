import { describe, expect, it } from 'vitest';
import { buildWithdrawalWarnings, type WarningInput } from './withdrawal-warnings';

const base: WarningInput = {
  quantity: '2',
  unit: 'cx',
  notNearest: false,
  chosenLot: { lotCode: 'A', expiresOn: '2027-03-01' },
  suggestedLot: { lotCode: 'B', expiresOn: '2026-12-01' },
  avgDailyConsumption: '1',
  highWithdrawalMultiplier: 3,
};
const codes = (over: Partial<WarningInput> = {}) => buildWithdrawalWarnings({ ...base, ...over }).map((w) => w.code);

describe('E4-H2 avisos de retirada', () => {
  it('sem motivo para avisar, não avisa', () => {
    expect(codes()).toEqual([]);
  });

  describe('RN-09 lote diferente do sugerido', () => {
    it('avisa com o lote escolhido e o que deveria sair primeiro', () => {
      const [w] = buildWithdrawalWarnings({ ...base, notNearest: true });
      expect(w.code).toBe('LOT_NOT_NEAREST_EXPIRY');
      expect(w.details).toEqual({
        chosenLotCode: 'A',
        chosenLotExpiresOn: '2027-03-01',
        suggestedLotCode: 'B',
        suggestedLotExpiresOn: '2026-12-01',
      });
      expect(w.message).toContain('lote A');
      expect(w.message).toContain('lote B');
    });

    it('lote sem validade aparece como "sem validade"', () => {
      const [w] = buildWithdrawalWarnings({ ...base, notNearest: true, chosenLot: { lotCode: 'N', expiresOn: null } });
      expect(w.message).toContain('sem validade');
      expect(w.details.chosenLotExpiresOn).toBeNull();
    });
  });

  describe('RN-10 retirada acima da média', () => {
    it('o limite é o maior entre 3× a média e 1 unidade: média 2 dá limite 6', () => {
      expect(codes({ avgDailyConsumption: '2', quantity: '6' })).toEqual([]);
      expect(codes({ avgDailyConsumption: '2', quantity: '6.001' })).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
    });

    it('com média baixa vale o piso de 1 unidade', () => {
      expect(codes({ avgDailyConsumption: '0.1', quantity: '1' })).toEqual([]);
      expect(codes({ avgDailyConsumption: '0.1', quantity: '1.001' })).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
    });

    it('sem histórico de consumo o limite é 1', () => {
      expect(codes({ avgDailyConsumption: '0', quantity: '1' })).toEqual([]);
      expect(codes({ avgDailyConsumption: '0', quantity: '2' })).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
    });

    it('usa o múltiplo configurado', () => {
      expect(codes({ avgDailyConsumption: '2', quantity: '6.001', highWithdrawalMultiplier: 5 })).toEqual([]);
      expect(codes({ avgDailyConsumption: '2', quantity: '4', highWithdrawalMultiplier: 1 })).toEqual(['QUANTITY_ABOVE_DAILY_AVERAGE']);
    });

    it('os detalhes trazem a quantidade, a média e o limite', () => {
      const [w] = buildWithdrawalWarnings({ ...base, avgDailyConsumption: '2', quantity: '7' });
      expect(w.details).toEqual({ quantity: '7.000', avgDailyConsumption: '2.000', threshold: '6.000', multiplier: '3' });
      expect(w.message).toContain('7.000 cx');
    });
  });

  it('os dois avisos juntos saem na ordem lote, quantidade', () => {
    expect(codes({ notNearest: true, quantity: '50' })).toEqual(['LOT_NOT_NEAREST_EXPIRY', 'QUANTITY_ABOVE_DAILY_AVERAGE']);
  });
});
