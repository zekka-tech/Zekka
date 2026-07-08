const { AppError } = require('../../../src/utils/errors');
const { validateUploadedFile } = require('../../../src/utils/upload-validation');

describe('upload validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTIVIRUS_MODE;
    delete process.env.ANTIVIRUS_SCAN_HOOK;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts a valid PNG file', async () => {
    await expect(
      validateUploadedFile({
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 32,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])
      })
    ).resolves.toBeUndefined();
  });

  it('rejects files with disallowed extensions', async () => {
    await expect(
      validateUploadedFile({
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 10,
        buffer: Buffer.from([0x4d, 0x5a])
      })
    ).rejects.toThrow('File extension not allowed');
  });

  it('rejects files whose magic bytes do not match the extension', async () => {
    await expect(
      validateUploadedFile({
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        size: 10,
        buffer: Buffer.from('not-a-real-pdf')
      })
    ).rejects.toThrow('PDF signature validation failed');
  });

  it('rejects JSON files that do not start with a JSON payload', async () => {
    await expect(
      validateUploadedFile({
        originalname: 'payload.json',
        mimetype: 'application/json',
        size: 10,
        buffer: Buffer.from('x-invalid-json')
      })
    ).rejects.toThrow('JSON payload validation failed');
  });

  it('requires an antivirus hook in strict mode', async () => {
    process.env.ANTIVIRUS_MODE = 'strict';

    await expect(
      validateUploadedFile({
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 32,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])
      })
    ).rejects.toThrow(AppError);
    await expect(
      validateUploadedFile({
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 32,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])
      })
    ).rejects.toThrow(
      'Antivirus scanning is required but ANTIVIRUS_SCAN_HOOK is not configured'
    );
  });
});
