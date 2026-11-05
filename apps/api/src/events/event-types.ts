/** Eventos do contrato (parte 6), CloudEvents 1.0. */
export const CONSUMED_EVENTS = {
  iamUser: ['iam.user.created', 'iam.user.updated', 'iam.user.deactivated'], // V-01
  orgClinic: ['org.clinic.created', 'org.clinic.updated', 'org.clinic.deactivated'], // V-02
  careExecutionCompleted: ['care.procedure-execution.completed'], // V-03
  careExecutionCancelled: ['care.procedure-execution.cancelled'], // V-04
  requests: ['requests.request.created', 'requests.request.approved', 'requests.request.cancelled'], // V-05
} as const;

export const PUBLISHED_EVENTS = [
  'stock.item.created', 'stock.item.updated', 'stock.item.deactivated', // P-01
  'stock.movement.recorded', // P-02
  'stock.consumption.confirmed', 'stock.consumption.rejected', // P-03
  'stock.receipt.completed', 'stock.receipt.reversed', // P-04
  'stock.alert.raised', 'stock.alert.cleared', // P-05
  'stock.incorrect-receipt.overdue', // P-06
] as const;
export type PublishedEvent = (typeof PUBLISHED_EVENTS)[number];

export interface CloudEvent<T = unknown> {
  id: string;
  type: string;
  source: string;
  subject?: string;
  time: string;
  clinicid?: string;
  correlationid?: string;
  data: T;
}
