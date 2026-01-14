/**
 * Encryption Key Management System
 * 
 * Features:
 * - Secure key storage with envelope encryption
 * - Automatic key rotation
 * - Key versioning for decryption
 * - AES-256-GCM encryption
 * - Key derivation using PBKDF2
 * - Secure key backup and recovery
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 64,
  tagLength: 16,
  iterations: 100000, // PBKDF2 iterations
  digest: 'sha512'
};

class EncryptionKeyManager {
  constructor(options = {}) {
    this.keyStorePath = options.keyStorePath || path.join(process.cwd(), 'keys');
    this.masterKeyFile = path.join(this.keyStorePath, 'master.key');
    this.keysMetadataFile = path.join(this.keyStorePath, 'keys.json');
    this.rotationDays = options.rotationDays || 90; // Rotate every 90 days
    this.maxKeyAge = options.maxKeyAge || 365; // Keep keys for 1 year
    
    this.masterKey = null;
    this.dataKeys = new Map(); // version -> key
    this.currentKeyVersion = null;
    
    this.ensureKeyDirectory();
    this.initialize();
  }
  
  /**
   * Ensure key directory exists with secure permissions
   */
  ensureKeyDirectory() {
    if (!fs.existsSync(this.keyStorePath)) {
      fs.mkdirSync(this.keyStorePath, { recursive: true, mode: 0o700 });
    } else {
      // Ensure secure permissions
      fs.chmodSync(this.keyStorePath, 0o700);
    }
  }
  
  /**
   * Initialize key manager
   */
  initialize() {
    // Load or generate master key
    this.loadOrGenerateMasterKey();
    
    // Load data keys
    this.loadDataKeys();
    
    // Check if key rotation is needed
    this.checkKeyRotation();
  }
  
  /**
   * Load or generate master key
   */
  loadOrGenerateMasterKey() {
    // First, try to load from environment (most secure)
    const envMasterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (envMasterKey) {
      this.masterKey = Buffer.from(envMasterKey, 'hex');
      if (this.masterKey.length !== ENCRYPTION_CONFIG.keyLength) {
        throw new Error('Invalid MASTER_ENCRYPTION_KEY length');
      }
      return;
    }
    
    // Next, try to load from file
    if (fs.existsSync(this.masterKeyFile)) {
      const encryptedMaster = fs.readFileSync(this.masterKeyFile, 'utf8');
      this.masterKey = this.decryptMasterKey(encryptedMaster);
    } else {
      // Generate new master key
      this.masterKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
      this.saveMasterKey();
    }
  }
  
  /**
   * Save master key encrypted with passphrase
   */
  saveMasterKey() {
    const passphrase = process.env.KEY_PASSPHRASE || this.getDefaultPassphrase();
    
    // Derive key from passphrase
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const key = crypto.pbkdf2Sync(
      passphrase,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );
    
    // Encrypt master key
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    
    let encrypted = cipher.update(this.masterKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Save encrypted master key
    const data = {
      version: 1,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted: encrypted.toString('hex'),
      created: new Date().toISOString()
    };
    
    fs.writeFileSync(
      this.masterKeyFile,
      JSON.stringify(data, null, 2),
      { mode: 0o600 }
    );
  }
  
  /**
   * Decrypt master key
   */
  decryptMasterKey(encryptedData) {
    const data = typeof encryptedData === 'string' 
      ? JSON.parse(encryptedData) 
      : encryptedData;
    
    const passphrase = process.env.KEY_PASSPHRASE || this.getDefaultPassphrase();
    
    // Derive key from passphrase
    const salt = Buffer.from(data.salt, 'hex');
    const key = crypto.pbkdf2Sync(
      passphrase,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );
    
    // Decrypt master key
    const iv = Buffer.from(data.iv, 'hex');
    const tag = Buffer.from(data.tag, 'hex');
    const encrypted = Buffer.from(data.encrypted, 'hex');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }
  
  /**
   * Get default passphrase (should be overridden in production)
   */
  getDefaultPassphrase() {
    console.warn('WARNING: Using default passphrase. Set KEY_PASSPHRASE environment variable in production!');
    return 'zekka-default-passphrase-change-in-production';
  }
  
  /**
   * Load data keys from metadata file
   */
  loadDataKeys() {
    if (!fs.existsSync(this.keysMetadataFile)) {
      // Generate initial data key
      this.rotateKey();
      return;
    }
    
    const metadata = JSON.parse(fs.readFileSync(this.keysMetadataFile, 'utf8'));
    
    // Decrypt and load each key
    for (const [version, keyData] of Object.entries(metadata.keys)) {
      const encryptedKey = Buffer.from(keyData.encrypted, 'hex');
      const iv = Buffer.from(keyData.iv, 'hex');
      const tag = Buffer.from(keyData.tag, 'hex');
      
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_CONFIG.algorithm,
        this.masterKey,
        iv
      );
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedKey);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      this.dataKeys.set(parseInt(version), decrypted);
    }
    
    this.currentKeyVersion = metadata.currentVersion;
  }
  
  /**
   * Save data keys metadata
   */
  saveKeysMetadata() {
    const metadata = {
      currentVersion: this.currentKeyVersion,
      keys: {}
    };
    
    // Encrypt each key with master key
    for (const [version, key] of this.dataKeys.entries()) {
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      const cipher = crypto.createCipheriv(
        ENCRYPTION_CONFIG.algorithm,
        this.masterKey,
        iv
      );
      
      let encrypted = cipher.update(key);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const tag = cipher.getAuthTag();
      
      metadata.keys[version] = {
        encrypted: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        created: new Date().toISOString()
      };
    }
    
    fs.writeFileSync(
      this.keysMetadataFile,
      JSON.stringify(metadata, null, 2),
      { mode: 0o600 }
    );
  }
  
  /**
   * Rotate encryption key
   */
  rotateKey() {
    const newVersion = this.currentKeyVersion ? this.currentKeyVersion + 1 : 1;
    const newKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
    
    this.dataKeys.set(newVersion, newKey);
    this.currentKeyVersion = newVersion;
    
    this.saveKeysMetadata();
    
    console.info(`Encryption key rotated to version ${newVersion}`);
    return newVersion;
  }
  
  /**
   * Check if key rotation is needed
   */
  checkKeyRotation() {
    if (!fs.existsSync(this.keysMetadataFile)) return;
    
    const metadata = JSON.parse(fs.readFileSync(this.keysMetadataFile, 'utf8'));
    const currentKeyData = metadata.keys[this.currentKeyVersion];
    
    if (!currentKeyData) return;
    
    const created = new Date(currentKeyData.created);
    const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation >= this.rotationDays) {
      console.info('Automatic key rotation triggered');
      this.rotateKey();
    }
    
    // Clean up old keys
    this.cleanupOldKeys();
  }
  
  /**
   * Clean up keys older than maxKeyAge
   */
  cleanupOldKeys() {
    const metadata = JSON.parse(fs.readFileSync(this.keysMetadataFile, 'utf8'));
    
    for (const [version, keyData] of Object.entries(metadata.keys)) {
      const created = new Date(keyData.created);
      const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation >= this.maxKeyAge) {
        const versionNum = parseInt(version);
        if (versionNum !== this.currentKeyVersion) {
          this.dataKeys.delete(versionNum);
          console.info(`Removed old encryption key version ${version}`);
        }
      }
    }
    
    this.saveKeysMetadata();
  }
  
  /**
   * Encrypt data
   */
  encrypt(plaintext, keyVersion = null) {
    const version = keyVersion || this.currentKeyVersion;
    const key = this.dataKeys.get(version);
    
    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }
    
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Return version, iv, tag, and encrypted data
    return {
      version,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted: encrypted.toString('hex')
    };
  }
  
  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    const { version, iv, tag, encrypted } = encryptedData;
    const key = this.dataKeys.get(version);
    
    if (!key) {
      throw new Error(`Decryption key version ${version} not found`);
    }
    
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }
  
  /**
   * Re-encrypt data with current key version
   */
  reEncrypt(encryptedData) {
    if (encryptedData.version === this.currentKeyVersion) {
      return encryptedData; // Already using current version
    }
    
    const plaintext = this.decrypt(encryptedData);
    return this.encrypt(plaintext, this.currentKeyVersion);
  }
  
  /**
   * Get current key version
   */
  getCurrentVersion() {
    return this.currentKeyVersion;
  }
  
  /**
   * Generate data encryption key for external use
   */
  generateDEK() {
    return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  }
  
  /**
   * Wrap (encrypt) a data encryption key
   */
  wrapKey(dek) {
    const dekBuffer = Buffer.isBuffer(dek) ? dek : Buffer.from(dek, 'hex');
    return this.encrypt(dekBuffer.toString('hex'));
  }
  
  /**
   * Unwrap (decrypt) a data encryption key
   */
  unwrapKey(wrappedKey) {
    const dekHex = this.decrypt(wrappedKey);
    return Buffer.from(dekHex, 'hex');
  }
}

// Singleton instance
let keyManagerInstance = null;

/**
 * Get key manager instance
 */
function getKeyManager(options) {
  if (!keyManagerInstance) {
    keyManagerInstance = new EncryptionKeyManager(options);
  }
  return keyManagerInstance;
}

module.exports = {
  EncryptionKeyManager,
  getKeyManager,
  ENCRYPTION_CONFIG
};
