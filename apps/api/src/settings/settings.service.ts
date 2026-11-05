import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class SettingsService {
  get(): Promise<never> {
    return notImplemented('E-53', 'Parâmetros de cálculo e de alerta (RF-04)');
  }
  update(_body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-54', 'Altera os parâmetros do módulo');
  }
}
