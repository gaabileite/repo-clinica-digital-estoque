import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessModule } from './access/access.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { ErrorMonitoringService } from './common/observability/error-monitoring.service';
import { HttpLoggingInterceptor } from './common/observability/logging.interceptor';
import { RequestIdMiddleware } from './common/observability/request-id.middleware';
import { ConfigModule } from './config/config.module';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ItemsModule } from './items/items.module';
import { CategoriesModule } from './categories/categories.module';
import { PackagesModule } from './packages/packages.module';
import { StockModule } from './stock/stock.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { ProcedureConsumptionsModule } from './procedure-consumptions/procedure-consumptions.module';
import { ReturnsModule } from './returns/returns.module';
import { MovementsModule } from './movements/movements.module';
import { InventoryAdjustmentsModule } from './inventory-adjustments/inventory-adjustments.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { IncorrectReceiptsModule } from './incorrect-receipts/incorrect-receipts.module';
import { AuditModule } from './audit/audit.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { NetworkModule } from './network/network.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SettingsModule } from './settings/settings.module';
import { InternalModule } from './internal/internal.module';
import { BudgetModule } from './budget/budget.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AccessModule,
    EventsModule,
    ItemsModule,
    CategoriesModule,
    PackagesModule,
    StockModule,
    WithdrawalsModule,
    ProcedureConsumptionsModule,
    ReturnsModule,
    MovementsModule,
    InventoryAdjustmentsModule,
    ReceiptsModule,
    IncorrectReceiptsModule,
    AuditModule,
    AlertsModule,
    DashboardModule,
    ReportsModule,
    NetworkModule,
    PermissionsModule,
    SettingsModule,
    InternalModule,
    BudgetModule,
  ],
  controllers: [HealthController],
  providers: [
    ErrorMonitoringService,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
