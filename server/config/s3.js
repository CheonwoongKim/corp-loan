/**
 * MinIO S3 Configuration
 */

const AWS = require('aws-sdk');
require('dotenv').config();

// S3 configuration
const s3Config = {
    endpoint: process.env.S3_ENDPOINT || 'http://ywstorage.synology.me:9100',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'cheonwoongkim',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '0908zxCV!!',
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || true,
    signatureVersion: 'v4'
};

// Create S3 instance
const s3 = new AWS.S3(s3Config);

// Bucket configuration
const bucketName = process.env.S3_BUCKET_NAME || 'corp-loan-documents';

/**
 * Test S3 connection and create bucket if not exists
 */
async function initializeS3() {
    try {
        // Test connection by listing buckets
        const buckets = await s3.listBuckets().promise();
        console.log('✅ MinIO S3 연결 성공');

        // Check if bucket exists
        const bucketExists = buckets.Buckets.some(bucket => bucket.Name === bucketName);

        if (!bucketExists) {
            console.log(`📦 버킷 생성 중: ${bucketName}`);
            await s3.createBucket({
                Bucket: bucketName,
                CreateBucketConfiguration: {
                    LocationConstraint: s3Config.region
                }
            }).promise();

            // Set bucket policy for public read access (optional)
            const bucketPolicy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: '*',
                        Action: 's3:GetObject',
                        Resource: `arn:aws:s3:::${bucketName}/public/*`
                    }
                ]
            };

            await s3.putBucketPolicy({
                Bucket: bucketName,
                Policy: JSON.stringify(bucketPolicy)
            }).promise();

            console.log('✅ 버킷 생성 및 정책 설정 완료');
        } else {
            console.log(`✅ 버킷 확인: ${bucketName}`);
        }

        return true;
    } catch (error) {
        console.error('❌ MinIO S3 초기화 실패:', error.message);
        return false;
    }
}

/**
 * Generate S3 key for file upload
 */
function generateS3Key(loanId, documentType, originalFilename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = originalFilename.split('.').pop();
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

    return `loans/${loanId}/${documentType}/${filename}`;
}

/**
 * Upload file to S3
 */
async function uploadFile(buffer, key, mimeType) {
    try {
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            Metadata: {
                'uploaded-at': new Date().toISOString(),
                'system': 'corp-loan-system'
            }
        };

        const result = await s3.upload(uploadParams).promise();

        return {
            success: true,
            data: {
                bucket: result.Bucket,
                key: result.Key,
                url: result.Location,
                etag: result.ETag
            }
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate presigned URL for file access
 */
async function getPresignedUrl(key, expires = 3600) {
    try {
        const url = await s3.getSignedUrlPromise('getObject', {
            Bucket: bucketName,
            Key: key,
            Expires: expires
        });

        return { success: true, url };
    } catch (error) {
        console.error('Presigned URL error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete file from S3
 */
async function deleteFile(key) {
    try {
        await s3.deleteObject({
            Bucket: bucketName,
            Key: key
        }).promise();

        return { success: true };
    } catch (error) {
        console.error('S3 delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * List files in S3 bucket
 */
async function listFiles(prefix = '') {
    try {
        const result = await s3.listObjectsV2({
            Bucket: bucketName,
            Prefix: prefix
        }).promise();

        return {
            success: true,
            data: result.Contents.map(obj => ({
                key: obj.Key,
                size: obj.Size,
                lastModified: obj.LastModified,
                etag: obj.ETag
            }))
        };
    } catch (error) {
        console.error('S3 list error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get S3 bucket statistics
 */
async function getBucketStats() {
    try {
        const result = await s3.listObjectsV2({
            Bucket: bucketName
        }).promise();

        const stats = {
            totalFiles: result.KeyCount || 0,
            totalSize: result.Contents ? result.Contents.reduce((sum, obj) => sum + obj.Size, 0) : 0,
            lastUpdated: new Date().toISOString()
        };

        return { success: true, data: stats };
    } catch (error) {
        console.error('S3 stats error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    s3,
    bucketName,
    initializeS3,
    generateS3Key,
    uploadFile,
    getPresignedUrl,
    deleteFile,
    listFiles,
    getBucketStats
};