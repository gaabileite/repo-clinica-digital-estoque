import { Global, Module } from '@nestjs/common';
import { FILES_ADAPTER } from './files/files.adapter';
import { MockFilesAdapter } from './files/mock-files.adapter';

/**
 * Registers every external-module adapter. To switch to a real integration,
 * change `useClass` here; the code that uses the adapter does not change.
 */
@Global()
@Module({
  providers: [{ provide: FILES_ADAPTER, useClass: MockFilesAdapter }],
  exports: [FILES_ADAPTER],
})
export class IntegrationsModule {}