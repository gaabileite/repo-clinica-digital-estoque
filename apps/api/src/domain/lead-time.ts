export interface LeadTimeSample {
  /** Data do pedido (ausente em doações). */
  orderedOn?: string;
  receivedOn: string;
}

export interface LeadTime {
  days: number;
  samples: number;
  source: 'measured' | 'estimated';
}

const civil = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

/**
 * RN-03: média, em dias, entre a data do pedido e a do recebimento nas entradas não estornadas.
 * Sem entradas com data de pedido, vale o tempo de reposição estimado no cadastro.
 */
export function leadTime(samples: LeadTimeSample[], estimatedDays: number): LeadTime {
  const days = samples
    .filter((s) => s.orderedOn)
    .map((s) => Math.round((civil(s.receivedOn) - civil(s.orderedOn as string)) / 864e5))
    .filter((d) => d >= 0);
  if (days.length === 0) return { days: estimatedDays, samples: 0, source: 'estimated' };
  return { days: days.reduce((a, b) => a + b, 0) / days.length, samples: days.length, source: 'measured' };
}
