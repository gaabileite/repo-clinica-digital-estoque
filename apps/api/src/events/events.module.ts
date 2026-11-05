import { Global, Module } from '@nestjs/common';
import { CareExecutionConsumer } from './consumers/care-execution.consumer';
import { IamUserConsumer } from './consumers/iam-user.consumer';
import { OrgClinicConsumer } from './consumers/org-clinic.consumer';
import { RequestsConsumer } from './consumers/requests.consumer';
import { EventPublisher } from './event-publisher.service';
import { EVENT_TRANSPORT, SimulatedEventTransport } from './event-transport';
import { OutboxDispatcher } from './outbox-dispatcher.service';
import { OUTBOX_REPOSITORY, PrismaOutboxRepository } from './outbox.repository';
import { ProcessedEventsService } from './processed-events.service';

@Global()
@Module({
  providers: [
    EventPublisher,
    OutboxDispatcher,
    ProcessedEventsService,
    { provide: OUTBOX_REPOSITORY, useClass: PrismaOutboxRepository },
    { provide: EVENT_TRANSPORT, useClass: SimulatedEventTransport },
    IamUserConsumer,
    OrgClinicConsumer,
    CareExecutionConsumer,
    RequestsConsumer,
  ],
  exports: [EventPublisher, OutboxDispatcher, ProcessedEventsService],
})
export class EventsModule {}
