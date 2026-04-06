const path = require('path');
const { AppError } = require('./errors');

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.cs',
  '.rb',
  '.php'
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/x-yaml',
  'text/yaml',
  'text/x-yaml',
  'application/yaml',
  'application/javascript',
  'text/javascript',
  'application/typescript',
  'text/typescript',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'application/x-httpd-php',
  'text/x-ruby'
]);

function matchesMagicBytes(buffer, bytes) {
  return buffer.length >= bytes.length
    && bytes.every((byte, index) => buffer[index] === byte);
}

function validateMagicBytes(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const { mimetype, buffer } = file;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Uploaded file is empty or unreadable', 400);
  }

  if (extension === '.pdf' && !matchesMagicBytes(buffer, [0x25, 0x50, 0x44, 0x46])) {
    throw new AppError('PDF signature validation failed', 400);
  }

  if (extension === '.png' && !matchesMagicBytes(buffer, [0x89, 0x50, 0x4e, 0x47])) {
    throw new AppError('PNG signature validation failed', 400);
  }

  if (
    (extension === '.jpg' || extension === '.jpeg')
    && !matchesMagicBytes(buffer, [0xff, 0xd8, 0xff])
  ) {
    throw new AppError('JPEG signature validation failed', 400);
  }

  if (extension === '.gif' && !matchesMagicBytes(buffer, [0x47, 0x49, 0x46, 0x38])) {
    throw new AppError('GIF signature validation failed', 400);
  }

  if (
    extension === '.webp'
    && (!matchesMagicBytes(buffer, [0x52, 0x49, 0x46, 0x46]) || buffer.toString('ascii', 8, 12) !== 'WEBP')
  ) {
    throw new AppError('WEBP signature validation failed', 400);
  }

  if (
    mimetype === 'application/json'
    && !['{', '['].includes(buffer.toString('utf8', 0, 1).trim())
  ) {
    throw new AppError('JSON payload validation failed', 400);
  }
}

async function scanFileForThreats(file) {
  if (process.env.ANTIVIRUS_MODE !== 'strict') {
    return;
  }

  if (typeof process.env.ANTIVIRUS_SCAN_HOOK !== 'string' || !process.env.ANTIVIRUS_SCAN_HOOK) {
    throw new AppError(
      'Antivirus scanning is required but ANTIVIRUS_SCAN_HOOK is not configured',
      500
    );
  }

  if (file.size <= 0) {
    throw new AppError('Uploaded file is empty', 400);
  }
}

async function validateUploadedFile(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new AppError('File extension not allowed', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new AppError('File MIME type not allowed', 400);
  }

  validateMagicBytes(file);
  await scanFileForThreats(file);
}

module.exports = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  validateUploadedFile
};
