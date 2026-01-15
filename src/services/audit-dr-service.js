/**
 * Audit Log Disaster Recovery Service
 * Ensures audit logs survive regional failures via S3 Cross-Region Replication
 */

const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');

class AuditDRService {
  constructor(options = {}) {
    this.s3Primary = new AWS.S3({ 
      region: options.primaryRegion || process.env.AWS_PRIMARY_REGION || 'us-east-1' 
    });
    this.s3Secondary = new AWS.S3({ 
      region: options.secondaryRegion || process.env.AWS_SECONDARY_REGION || 'eu-west-1' 
    });
    
    this.bucketPrimary = options.bucketPrimary || process.env.S3_AUDIT_BUCKET_PRIMARY || 'zekka-audit-logs-us-east-1';
    this.bucketSecondary = options.bucketSecondary || process.env.S3_AUDIT_BUCKET_SECONDARY || 'zekka-audit-logs-eu-west-1';
    this.logDir = options.logDir || '/var/log/zekka/audit';
    
    // Setup CRR on initialization
    this.setupCrossRegionReplication();
  }

  async setupCrossRegionReplication() {
    const replicationConfig = {
      Role: process.env.S3_REPLICATION_ROLE_ARN,
      Rules: [
        {
          ID: 'ReplicateAllAuditLogs',
          Status: 'Enabled',
          Priority: 1,
          Filter: { Prefix: 'audit/' },
          Destination: {
            Bucket: `arn:aws:s3:::${this.bucketSecondary}`,
            ReplicationTime: {
              Status: 'Enabled',
              Time: { Minutes: 15 }
            },
            Metrics: {
              Status: 'Enabled',
              EventThreshold: { Minutes: 15 }
            },
            StorageClass: 'STANDARD_IA'
          },
          DeleteMarkerReplication: { Status: 'Enabled' }
        }
      ]
    };

    try {
      await this.s3Primary.putBucketReplication({
        Bucket: this.bucketPrimary,
        ReplicationConfiguration: replicationConfig
      }).promise();
      
      console.log('✅ Cross-region replication configured for audit logs');
    } catch (error) {
      console.error('⚠️  Failed to configure cross-region replication:', error.message);
    }
  }

  async archiveAuditLogs(logDate) {
    const logFile = path.join(this.logDir, `audit-${logDate}.log`);
    const s3Key = `audit/${logDate}/audit-logs.log`;
    
    try {
      // Check if log file exists
      await fs.access(logFile);
      
      // Upload to primary region
      await this.uploadToS3(this.s3Primary, this.bucketPrimary, logFile, s3Key);
      console.log(`✅ Audit logs archived to primary region: ${logDate}`);
      
      // Verify replication to secondary region (after 15 min)
      setTimeout(async () => {
        const replicated = await this.verifyReplication(s3Key);
        if (replicated) {
          console.log(`✅ Replication verified for ${logDate}`);
        } else {
          console.warn(`⚠️  Replication pending or failed for ${logDate}, initiating manual backup`);
          await this.uploadToS3(this.s3Secondary, this.bucketSecondary, logFile, s3Key);
        }
      }, 15 * 60 * 1000);
      
      return { success: true, key: s3Key };
    } catch (error) {
      console.error('❌ Failed to archive audit logs:', error);
      // Fallback: manually copy to secondary region
      try {
        await this.uploadToS3(this.s3Secondary, this.bucketSecondary, logFile, s3Key);
        console.log('✅ Fallback: Audit logs archived to secondary region');
        return { success: true, key: s3Key, fallback: true };
      } catch (fallbackError) {
        console.error('❌ Fallback upload also failed:', fallbackError);
        throw error;
      }
    }
  }

  async uploadToS3(s3Client, bucket, localPath, s3Key) {
    const fileContent = await fs.readFile(localPath);
    
    await s3Client.putObject({
      Bucket: bucket,
      Key: s3Key,
      Body: fileContent,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'archived-at': new Date().toISOString(),
        'retention-days': '2555', // 7 years for compliance
        'source': 'zekka-audit-service'
      },
      Tagging: 'compliance=required&retention=7years'
    }).promise();
  }

  async verifyReplication(s3Key) {
    try {
      const result = await this.s3Secondary.headObject({
        Bucket: this.bucketSecondary,
        Key: s3Key
      }).promise();
      
      // Check replication status
      return result.ReplicationStatus === 'COMPLETED' || result.ReplicationStatus === 'REPLICA';
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      console.error(`⚠️  Error verifying replication for ${s3Key}:`, error);
      return false;
    }
  }

  async restoreFromDR(date, targetRegion = 'us-east-1') {
    const s3Key = `audit/${date}/audit-logs.log`;
    const s3Client = targetRegion === 'us-east-1' ? this.s3Primary : this.s3Secondary;
    const bucket = targetRegion === 'us-east-1' ? this.bucketPrimary : this.bucketSecondary;
    
    try {
      const response = await s3Client.getObject({
        Bucket: bucket,
        Key: s3Key
      }).promise();
      
      console.log(`✅ Audit logs restored from ${targetRegion} for ${date}`);
      return response.Body.toString('utf-8');
    } catch (error) {
      console.error(`❌ Failed to restore audit logs for ${date}:`, error);
      
      // Try alternate region
      const alternateRegion = targetRegion === 'us-east-1' ? 'eu-west-1' : 'us-east-1';
      const alternateClient = alternateRegion === 'us-east-1' ? this.s3Primary : this.s3Secondary;
      const alternateBucket = alternateRegion === 'us-east-1' ? this.bucketPrimary : this.bucketSecondary;
      
      try {
        console.log(`🔄 Attempting restore from alternate region: ${alternateRegion}`);
        const response = await alternateClient.getObject({
          Bucket: alternateBucket,
          Key: s3Key
        }).promise();
        
        console.log(`✅ Audit logs restored from alternate region ${alternateRegion} for ${date}`);
        return response.Body.toString('utf-8');
      } catch (alternateError) {
        throw new Error(`Failed to restore from both regions: ${error.message} | ${alternateError.message}`);
      }
    }
  }

  async getReplicationMetrics() {
    try {
      const metrics = await this.s3Primary.getBucketReplication({
        Bucket: this.bucketPrimary
      }).promise();
      
      return {
        enabled: true,
        rules: metrics.ReplicationConfiguration.Rules,
        destinationBucket: this.bucketSecondary,
        status: 'active'
      };
    } catch (error) {
      return {
        enabled: false,
        error: error.message,
        status: 'not configured'
      };
    }
  }
}

module.exports = AuditDRService;
