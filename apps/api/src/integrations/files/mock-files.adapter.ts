import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { FilesAdapter } from './files.adapter';

/** Fake Files module: keeps nothing, returns predictable fake links until the real API exists. */
@Injectable()
export class MockFilesAdapter implements FilesAdapter {
  async createUpload(input: { fileName: string; contentType: string }) {
    const fileId = randomUUID();
    return { fileId, uploadUrl: `http://localhost/mock-files/upload/${fileId}/${encodeURIComponent(input.fileName)}` };
  }

  async getSignedUrl(fileId: string, ttlSeconds = 300) {
    return {
      url: `http://localhost/mock-files/download/${fileId}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }
}