/** Injection token: other code asks Nest for this name, never for the mock class. */
export const FILES_ADAPTER = Symbol('FILES_ADAPTER');

/** What the Stock module needs from the Files module (contract D-18 and D-19). */
export interface FilesAdapter {
  /** D-18: starts an upload and returns a pre-signed URL to send the file to. */
  createUpload(input: { fileName: string; contentType: string }): Promise<{ fileId: string; uploadUrl: string }>;

  /** D-19: temporary download link (the contract uses 300 seconds). */
  getSignedUrl(fileId: string, ttlSeconds?: number): Promise<{ url: string; expiresAt: string }>;
}