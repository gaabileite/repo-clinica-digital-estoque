import { describe, expect, it } from 'vitest';
import { computeConsumptionProfile } from './consumption-profile';

const base = { dropThresholdPercent: 50 };

describe('E-15 perfil de consumo', () => {
  it('médias: 30 dias ÷ 30, janela aprendida ÷ 75, últimos 14 dias ÷ 14', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '60', netLearnedWindow: '150', netLast14Days: '28' });
    expect(r).toMatchObject({ avgDailyLast30Days: '2.000', learnedAvgDaily: '2.000', avgDailyLast14Days: '2.000', dropPercent: 0, dropDetected: false });
  });

  it('queda de 50% ou mais com média aprendida de pelo menos 0,15 dispara o indicador (RN-11)', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '30', netLearnedWindow: '150', netLast14Days: '14' });
    expect(r.learnedAvgDaily).toBe('2.000');
    expect(r.avgDailyLast14Days).toBe('1.000');
    expect(r.dropPercent).toBe(50);
    expect(r.dropDetected).toBe(true);
  });

  it('queda de 49,75% não dispara (a decisão usa o valor sem arredondar)', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '30', netLearnedWindow: '150', netLast14Days: '14.07' });
    expect(r.dropPercent).toBe(49.8);
    expect(r.dropDetected).toBe(false);
  });

  it('queda de 49,95% aparece como 50 mas não dispara', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '30', netLearnedWindow: '150', netLast14Days: '14.014' });
    expect(r.dropPercent).toBe(50);
    expect(r.dropDetected).toBe(false);
  });

  it('média aprendida abaixo de 0,15 por dia nunca dispara', () => {
    // 10 ÷ 75 = 0,133 por dia; consumo recente zerado dá queda de 100%.
    const r = computeConsumptionProfile({ ...base, netLast30Days: '0', netLearnedWindow: '10', netLast14Days: '0' });
    expect(r.dropPercent).toBe(100);
    expect(r.dropDetected).toBe(false);
  });

  it('média aprendida exatamente 0,15 conta', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '0', netLearnedWindow: '11.25', netLast14Days: '0' });
    expect(r.learnedAvgDaily).toBe('0.150');
    expect(r.dropDetected).toBe(true);
  });

  it('sem histórico aprendido: queda nula e sem indicador', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '5', netLearnedWindow: '0', netLast14Days: '5' });
    expect(r).toMatchObject({ dropPercent: null, dropDetected: false });
  });

  it('consumo líquido negativo (mais devoluções que retiradas) conta como zero', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '-4', netLearnedWindow: '-1', netLast14Days: '-2' });
    expect(r).toMatchObject({ avgDailyLast30Days: '0.000', learnedAvgDaily: '0.000', avgDailyLast14Days: '0.000', dropPercent: null });
  });

  it('crescimento do consumo dá queda negativa', () => {
    const r = computeConsumptionProfile({ ...base, netLast30Days: '60', netLearnedWindow: '75', netLast14Days: '28' });
    expect(r.dropPercent).toBe(-100);
    expect(r.dropDetected).toBe(false);
  });

  it('usa o limite configurado', () => {
    const input = { netLast30Days: '30', netLearnedWindow: '150', netLast14Days: '22.4' }; // queda de 20%
    expect(computeConsumptionProfile({ ...input, dropThresholdPercent: 50 }).dropDetected).toBe(false);
    expect(computeConsumptionProfile({ ...input, dropThresholdPercent: 20 })).toMatchObject({ dropDetected: true, dropThresholdPercent: 20 });
  });
});
