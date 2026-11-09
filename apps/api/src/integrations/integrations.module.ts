import { Global, Module } from '@nestjs/common';
import { CARE_ADAPTER } from './care/care.adapter';
import { MockCareAdapter } from './care/mock-care.adapter';
import { FILES_ADAPTER } from './files/files.adapter';
import { MockFilesAdapter } from './files/mock-files.adapter';
import { IAM_ADAPTER } from './iam/iam.adapter';
import { MockIamAdapter } from './iam/mock-iam.adapter';
import { MockNotificationsAdapter } from './notifications/mock-notifications.adapter';
import { NOTIFICATIONS_ADAPTER } from './notifications/notifications.adapter';
import { MockOrganizationAdapter } from './organization/mock-organization.adapter';
import { ORGANIZATION_ADAPTER } from './organization/organization.adapter';
import { MockRequestsAdapter } from './requests/mock-requests.adapter';
import { REQUESTS_ADAPTER } from './requests/requests.adapter';

/**
 * Registers every external-module adapter (contract section 4, A1 to A6).
 * To switch one to a real integration, change its `useClass` here; the code that
 * uses the adapter does not change.
 */
@Global()
@Module({
  providers: [
    { provide: IAM_ADAPTER, useClass: MockIamAdapter },
    { provide: ORGANIZATION_ADAPTER, useClass: MockOrganizationAdapter },
    { provide: CARE_ADAPTER, useClass: MockCareAdapter },
    { provide: REQUESTS_ADAPTER, useClass: MockRequestsAdapter },
    { provide: NOTIFICATIONS_ADAPTER, useClass: MockNotificationsAdapter },
    { provide: FILES_ADAPTER, useClass: MockFilesAdapter },
  ],
  exports: [IAM_ADAPTER, ORGANIZATION_ADAPTER, CARE_ADAPTER, REQUESTS_ADAPTER, NOTIFICATIONS_ADAPTER, FILES_ADAPTER],
})
export class IntegrationsModule {}