import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class NotificationsService {
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('RF-29', 'Central de notificações do usuário (RF-29)');
  }
  markRead(_clinicId: string, _notificationId: string): Promise<never> {
    return notImplemented('RF-29', 'Marca como lida (RF-29)');
  }
  markAllRead(_clinicId: string): Promise<never> {
    return notImplemented('RF-29', 'Marca todas como lidas (RF-29)');
  }
  preferences(): Promise<never> {
    return notImplemented('RF-30', 'Preferências por tipo e canal (RF-30)');
  }
  updatePreferences(_body: Record<string, unknown>): Promise<never> {
    return notImplemented('RF-30', 'Altera as preferências (RF-30)');
  }
}
