/**
 * File Storage Utility
 *
 * Provides abstraction layer for file storage
 * Supports local filesystem and S3-compatible storage
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const config = require('../config');

/**
 * Storage configuration
 */
const STORAGE_CONFIG = {
  type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
  local: {
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    allowedExtensions: process.env.ALLOWED_EXTENSIONS
      ? process.env.ALLOWED_EXTENSIONS.split(',')
      : ['.pdf', '.txt', '.md', '.doc', '.docx', '.json', '.csv', '.xlsx']
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    endpoint: process.env.S3_ENDPOINT || null
  }
};

/**
 * Initialize storage (create directories if needed)
 */
async function initializeStorage() {
  if (STORAGE_CONFIG.type === 'local') {
    try {
      await fs.mkdir(STORAGE_CONFIG.local.uploadDir, { recursive: true });
      console.log('✅ Local file storage initialized:', STORAGE_CONFIG.local.uploadDir);
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
      throw error;
    }
  } else if (STORAGE_CONFIG.type === 's3') {
    // TODO: Initialize S3 client when needed
    console.log('✅ S3 storage configuration loaded');
  }
}

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename with hash
 */
function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();

  // Sanitize filename
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);

  return `${sanitized}_${timestamp}_${hash}${ext}`;
}

/**
 * Validate file
 * @param {object} file - File object with name and size
 * @throws {Error} If validation fails
 */
function validateFile(file) {
  if (!file || !file.name) {
    throw new Error('Invalid file object');
  }

  // Check file size
  if (file.size > STORAGE_CONFIG.local.maxFileSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${STORAGE_CONFIG.local.maxFileSize / 1024 / 1024}MB`
    );
  }

  // Check file extension
  const ext = path.extname(file.name).toLowerCase();
  if (!STORAGE_CONFIG.local.allowedExtensions.includes(ext)) {
    throw new Error(
      `File type ${ext} not allowed. Allowed types: ${STORAGE_CONFIG.local.allowedExtensions.join(', ')}`
    );
  }

  return true;
}

/**
 * Upload file to local storage
 * @param {Buffer|Stream} fileData - File data
 * @param {string} filename - Filename
 * @param {string} subfolder - Optional subfolder (e.g., projectId)
 * @returns {Promise<object>} Upload result with path and metadata
 */
async function uploadToLocal(fileData, filename, subfolder = '') {
  try {
    // Create subfolder if specified
    const targetDir = subfolder
      ? path.join(STORAGE_CONFIG.local.uploadDir, subfolder)
      : STORAGE_CONFIG.local.uploadDir;

    await fs.mkdir(targetDir, { recursive: true });

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    const filePath = path.join(targetDir, uniqueFilename);

    // Write file
    if (Buffer.isBuffer(fileData)) {
      await fs.writeFile(filePath, fileData);
    } else {
      // Handle stream
      const writeStream = createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        fileData.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      success: true,
      filename: uniqueFilename,
      originalName: filename,
      path: filePath,
      relativePath: subfolder ? `${subfolder}/${uniqueFilename}` : uniqueFilename,
      size: stats.size,
      storageType: 'local',
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Local upload failed:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload file to S3
 * @param {Buffer|Stream} fileData - File data
 * @param {string} filename - Filename
 * @param {string} subfolder - Optional subfolder (e.g., projectId)
 * @returns {Promise<object>} Upload result
 */
async function uploadToS3(fileData, filename, subfolder = '') {
  // TODO: Implement S3 upload using AWS SDK
  // This is a placeholder for S3 implementation
  throw new Error('S3 storage not yet implemented. Please use local storage.');
}

/**
 * Upload file (auto-detect storage type)
 * @param {Buffer|Stream} fileData - File data
 * @param {string} filename - Original filename
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
async function uploadFile(fileData, filename, options = {}) {
  const { subfolder = '', validate = true } = options;

  // Validate file if requested
  if (validate) {
    validateFile({
      name: filename,
      size: Buffer.isBuffer(fileData) ? fileData.length : 0
    });
  }

  // Upload based on storage type
  if (STORAGE_CONFIG.type === 'local') {
    return uploadToLocal(fileData, filename, subfolder);
  } else if (STORAGE_CONFIG.type === 's3') {
    return uploadToS3(fileData, filename, subfolder);
  } else {
    throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
  }
}

/**
 * Delete file from local storage
 * @param {string} filePath - Relative or absolute file path
 * @returns {Promise<boolean>} Success status
 */
async function deleteFromLocal(filePath) {
  try {
    // Convert relative path to absolute if needed
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(STORAGE_CONFIG.local.uploadDir, filePath);

    await fs.unlink(absolutePath);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete file:', error);
    return false;
  }
}

/**
 * Delete file from S3
 * @param {string} fileKey - S3 object key
 * @returns {Promise<boolean>} Success status
 */
async function deleteFromS3(fileKey) {
  // TODO: Implement S3 delete
  throw new Error('S3 storage not yet implemented');
}

/**
 * Delete file (auto-detect storage type)
 * @param {string} filePath - File path or key
 * @returns {Promise<boolean>} Success status
 */
async function deleteFile(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    return deleteFromLocal(filePath);
  } else if (STORAGE_CONFIG.type === 's3') {
    return deleteFromS3(filePath);
  } else {
    throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
  }
}

/**
 * Get file stream from local storage
 * @param {string} filePath - Relative or absolute file path
 * @returns {ReadStream} File read stream
 */
function getFileStreamLocal(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(STORAGE_CONFIG.local.uploadDir, filePath);

  return createReadStream(absolutePath);
}

/**
 * Get file stream from S3
 * @param {string} fileKey - S3 object key
 * @returns {ReadStream} File read stream
 */
function getFileStreamS3(fileKey) {
  // TODO: Implement S3 stream
  throw new Error('S3 storage not yet implemented');
}

/**
 * Get file stream (auto-detect storage type)
 * @param {string} filePath - File path or key
 * @returns {ReadStream} File read stream
 */
function getFileStream(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    return getFileStreamLocal(filePath);
  } else if (STORAGE_CONFIG.type === 's3') {
    return getFileStreamS3(filePath);
  } else {
    throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
  }
}

/**
 * Check if file exists
 * @param {string} filePath - File path or key
 * @returns {Promise<boolean>} File exists status
 */
async function fileExists(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(STORAGE_CONFIG.local.uploadDir, filePath);

      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  } else if (STORAGE_CONFIG.type === 's3') {
    // TODO: Implement S3 exists check
    throw new Error('S3 storage not yet implemented');
  }

  return false;
}

/**
 * Get file metadata
 * @param {string} filePath - File path or key
 * @returns {Promise<object>} File metadata
 */
async function getFileMetadata(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(STORAGE_CONFIG.local.uploadDir, filePath);

    const stats = await fs.stat(absolutePath);

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } else if (STORAGE_CONFIG.type === 's3') {
    // TODO: Implement S3 metadata
    throw new Error('S3 storage not yet implemented');
  }
}

/**
 * Calculate file hash (for deduplication)
 * @param {string} filePath - File path
 * @returns {Promise<string>} File SHA-256 hash
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = getFileStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Get storage statistics
 * @returns {Promise<object>} Storage statistics
 */
async function getStorageStats() {
  if (STORAGE_CONFIG.type === 'local') {
    try {
      // Count files and calculate total size
      const files = await fs.readdir(STORAGE_CONFIG.local.uploadDir, { recursive: true });
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = path.join(STORAGE_CONFIG.local.uploadDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        } catch {
          // Skip inaccessible files
        }
      }

      return {
        type: 'local',
        fileCount,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        uploadDir: STORAGE_CONFIG.local.uploadDir
      };
    } catch (error) {
      return {
        type: 'local',
        error: error.message
      };
    }
  } else if (STORAGE_CONFIG.type === 's3') {
    // TODO: Implement S3 stats
    return {
      type: 's3',
      message: 'S3 storage stats not yet implemented'
    };
  }
}

module.exports = {
  STORAGE_CONFIG,
  initializeStorage,
  generateUniqueFilename,
  validateFile,
  uploadFile,
  deleteFile,
  getFileStream,
  fileExists,
  getFileMetadata,
  calculateFileHash,
  getStorageStats
};
