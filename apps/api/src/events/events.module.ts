import { Global, Module } from '@nestjs/common';
import { CareExecutionConsumer } from './consumers/care-execution.consumer';
import { IamUserConsumer } from './consumers/iam-user.consumer';
import { OrgClinicConsumer } from './consumers/org-clinic.consumer';
import { RequestsConsumer } from './consumers/requests.consumer';
import { EventPublisher } from './event-publisher.service';

@Global()
@Module({
  providers: [EventPublisher, IamUserConsumer, OrgClinicConsumer, CareExecutionConsumer, RequestsConsumer],
  exports: [EventPublisher],
})
export class EventsModule {}
