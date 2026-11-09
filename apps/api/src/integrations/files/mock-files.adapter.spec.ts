import { describe, expect, it } from 'vitest';
import { MockFilesAdapter } from './mock-files.adapter';

describe('MockFilesAdapter', () => {
  const adapter = new MockFilesAdapter();

  it('creates an upload with a file id and a URL', async () => {
    const result = await adapter.createUpload({ fileName: 'donor-letter.pdf', contentType: 'application/pdf' });
    expect(result.fileId).toBeTruthy();
    expect(result.uploadUrl).toContain(result.fileId);
  });

  it('returns a download link that expires after the given time', async () => {
    const before = Date.now();
    const { url, expiresAt } = await adapter.getSignedUrl('file-1', 300);
    expect(url).toContain('file-1');
    expect(new Date(expiresAt).getTime()).toBeGreaterThanOrEqual(before + 299_000);
  });
});