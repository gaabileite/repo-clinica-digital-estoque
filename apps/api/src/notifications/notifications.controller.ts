import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('clinics/:clinicId/notifications')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Central de notificações do usuário (RF-29) (RF-29)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/notifications/:notificationId/read')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Marca como lida (RF-29) (RF-29)' })
  markRead(@Param('clinicId') clinicId: string, @Param('notificationId') notificationId: string) {
    return this.service.markRead(clinicId, notificationId);
  }

  @Post('clinics/:clinicId/notifications/read-all')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Marca todas como lidas (RF-29) (RF-29)' })
  markAllRead(@Param('clinicId') clinicId: string) {
    return this.service.markAllRead(clinicId);
  }

  @Get('me/notification-preferences')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Preferências por tipo e canal (RF-30) (RF-30)' })
  preferences() {
    return this.service.preferences();
  }

  @Put('me/notification-preferences')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Altera as preferências (RF-30) (RF-30)' })
  updatePreferences(@Body() body: Record<string, unknown>) {
    return this.service.updatePreferences(body);
  }
}
