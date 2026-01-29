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
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');

/**
 * Storage configuration
 */
const STORAGE_CONFIG = {
  type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
  local: {
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB default
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
 * S3 Client instance (lazy initialization)
 */
let s3Client = null;

/**
 * Get or create S3 client
 * @returns {S3Client} S3 client instance
 */
function getS3Client() {
  if (!s3Client) {
    const clientConfig = {
      region: STORAGE_CONFIG.s3.region,
      credentials: {
        accessKeyId: STORAGE_CONFIG.s3.accessKeyId,
        secretAccessKey: STORAGE_CONFIG.s3.secretAccessKey
      }
    };

    // Add custom endpoint if provided (for S3-compatible services)
    if (STORAGE_CONFIG.s3.endpoint) {
      clientConfig.endpoint = STORAGE_CONFIG.s3.endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO and other S3-compatible services
    }

    s3Client = new S3Client(clientConfig);
  }
  return s3Client;
}

/**
 * Initialize storage (create directories if needed)
 */
async function initializeStorage() {
  if (STORAGE_CONFIG.type === 'local') {
    try {
      await fs.mkdir(STORAGE_CONFIG.local.uploadDir, { recursive: true });
      console.log(
        '✅ Local file storage initialized:',
        STORAGE_CONFIG.local.uploadDir
      );
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
      throw error;
    }
  } else if (STORAGE_CONFIG.type === 's3') {
    try {
      // Initialize S3 client
      getS3Client();
      console.log('✅ S3 storage configuration loaded');
      console.log(`   Bucket: ${STORAGE_CONFIG.s3.bucket}`);
      console.log(`   Region: ${STORAGE_CONFIG.s3.region}`);
    } catch (error) {
      console.error('❌ Failed to initialize S3 storage:', error);
      throw error;
    }
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
      relativePath: subfolder
        ? `${subfolder}/${uniqueFilename}`
        : uniqueFilename,
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
  try {
    const client = getS3Client();

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    const key = subfolder ? `${subfolder}/${uniqueFilename}` : uniqueFilename;

    // Convert stream to buffer if needed
    let body = fileData;
    if (fileData && typeof fileData.pipe === 'function') {
      // Convert stream to buffer
      const chunks = [];
      // eslint-disable-next-line no-restricted-syntax
      for await (const chunk of fileData) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: STORAGE_CONFIG.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        originalName: filename,
        uploadedAt: new Date().toISOString()
      }
    });

    await client.send(command);

    return {
      success: true,
      filename: uniqueFilename,
      originalName: filename,
      key,
      bucket: STORAGE_CONFIG.s3.bucket,
      size: Buffer.byteLength(body),
      storageType: 's3',
      uploadedAt: new Date().toISOString(),
      url: STORAGE_CONFIG.s3.endpoint
        ? `${STORAGE_CONFIG.s3.endpoint}/${STORAGE_CONFIG.s3.bucket}/${key}`
        : `https://${STORAGE_CONFIG.s3.bucket}.s3.${STORAGE_CONFIG.s3.region}.amazonaws.com/${key}`
    };
  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
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
  }
  if (STORAGE_CONFIG.type === 's3') {
    return uploadToS3(fileData, filename, subfolder);
  }
  throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
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
  try {
    const client = getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: STORAGE_CONFIG.s3.bucket,
      Key: fileKey
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete file from S3:', error);
    return false;
  }
}

/**
 * Delete file (auto-detect storage type)
 * @param {string} filePath - File path or key
 * @returns {Promise<boolean>} Success status
 */
async function deleteFile(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    return deleteFromLocal(filePath);
  }
  if (STORAGE_CONFIG.type === 's3') {
    return deleteFromS3(filePath);
  }
  throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
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
 * @returns {Promise<Readable>} File read stream
 */
async function getFileStreamS3(fileKey) {
  try {
    const client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: STORAGE_CONFIG.s3.bucket,
      Key: fileKey
    });

    const response = await client.send(command);

    // Return the body stream
    return response.Body;
  } catch (error) {
    console.error('❌ Failed to get file stream from S3:', error);
    throw new Error(`Failed to get file stream from S3: ${error.message}`);
  }
}

/**
 * Get file stream (auto-detect storage type)
 * @param {string} filePath - File path or key
 * @returns {ReadStream|Promise<Readable>} File read stream
 */
function getFileStream(filePath) {
  if (STORAGE_CONFIG.type === 'local') {
    return getFileStreamLocal(filePath);
  }
  if (STORAGE_CONFIG.type === 's3') {
    return getFileStreamS3(filePath);
  }
  throw new Error(`Unknown storage type: ${STORAGE_CONFIG.type}`);
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
    try {
      const client = getS3Client();

      const command = new HeadObjectCommand({
        Bucket: STORAGE_CONFIG.s3.bucket,
        Key: filePath
      });

      await client.send(command);
      return true;
    } catch (error) {
      // If error code is NotFound, file doesn't exist
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      // For other errors, throw
      throw error;
    }
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
  }
  if (STORAGE_CONFIG.type === 's3') {
    try {
      const client = getS3Client();

      const command = new HeadObjectCommand({
        Bucket: STORAGE_CONFIG.s3.bucket,
        Key: filePath
      });

      const response = await client.send(command);

      return {
        size: response.ContentLength,
        createdAt: response.LastModified,
        modifiedAt: response.LastModified,
        contentType: response.ContentType,
        etag: response.ETag,
        metadata: response.Metadata || {}
      };
    } catch (error) {
      console.error('❌ Failed to get S3 file metadata:', error);
      throw new Error(`Failed to get file metadata from S3: ${error.message}`);
    }
  }

  return null;
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

    stream.on('data', (data) => hash.update(data));
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
      const files = await fs.readdir(STORAGE_CONFIG.local.uploadDir, {
        recursive: true
      });
      let totalSize = 0;
      let fileCount = 0;

      // eslint-disable-next-line no-restricted-syntax
      for (const file of files) {
        const filePath = path.join(STORAGE_CONFIG.local.uploadDir, file);
        try {
          // eslint-disable-next-line no-await-in-loop
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount += 1;
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
    try {
      const client = getS3Client();

      let totalSize = 0;
      let fileCount = 0;
      let continuationToken;

      // List all objects in the bucket
      do {
        const command = new ListObjectsV2Command({
          Bucket: STORAGE_CONFIG.s3.bucket,
          ContinuationToken: continuationToken
        });

        // eslint-disable-next-line no-await-in-loop
        const response = await client.send(command);

        if (response.Contents) {
          // eslint-disable-next-line no-restricted-syntax
          for (const object of response.Contents) {
            totalSize += object.Size || 0;
            fileCount += 1;
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return {
        type: 's3',
        bucket: STORAGE_CONFIG.s3.bucket,
        fileCount,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        region: STORAGE_CONFIG.s3.region
      };
    } catch (error) {
      return {
        type: 's3',
        error: error.message
      };
    }
  }

  return null;
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
