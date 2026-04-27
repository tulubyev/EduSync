import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { logger } from '../../logger';
import { executorConfig } from './config';

// Порог для переключения на multipart upload (100 МБ)
const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
// Размер каждой части multipart upload (50 МБ, минимум S3 — 5 МБ)
const MULTIPART_CHUNK_BYTES = 50 * 1024 * 1024;

export class BegetStorage {
  private s3: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = executorConfig.beget.bucket;
    this.publicUrl = executorConfig.beget.publicUrl;

    this.s3 = new S3Client({
      region: executorConfig.beget.region,
      endpoint: executorConfig.beget.endpoint,
      credentials: {
        accessKeyId: executorConfig.beget.accessKeyId,
        secretAccessKey: executorConfig.beget.secretAccessKey,
      },
      forcePathStyle: true,
    });

    logger.info(`BegetStorage initialized for bucket: ${this.bucketName}`);
  }

  async ping(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return true;
    } catch {
      return false;
    }
  }

  async uploadVideo(filePath: string, fileName: string): Promise<string> {
    try {
      const now = new Date();
      const key = `myepa/recordings/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileName}`;
      const contentType = fileName.endsWith('.mp4') ? 'video/mp4' : 'video/webm';

      const fileStat = fs.statSync(filePath);
      const fileSizeBytes = fileStat.size;
      logger.info(`Uploading ${fileName} (${Math.round(fileSizeBytes / 1024 / 1024)} МБ) to Beget S3...`);

      if (fileSizeBytes >= MULTIPART_THRESHOLD_BYTES) {
        await this.multipartUpload(filePath, key, contentType, fileSizeBytes);
      } else {
        const fileStream = fs.createReadStream(filePath);
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: fileStream,
            ContentLength: fileSizeBytes,
            ContentType: contentType,
          })
        );
      }

      const publicUrl = `${this.publicUrl}/${key}`;
      logger.info(`✅ Uploaded to Beget: ${publicUrl}`);

      try {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up local file: ${filePath}`);
      } catch (_e) {
        logger.warn(`Failed to clean up local file: ${filePath}`);
      }

      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload to Beget:', error);
      throw error;
    }
  }

  private async multipartUpload(
    filePath: string,
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<void> {
    let uploadId: string | undefined;
    const parts: Array<{ ETag: string; PartNumber: number }> = [];

    try {
      const create = await this.s3.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: contentType,
        })
      );
      uploadId = create.UploadId!;
      logger.info(`[S3 Multipart] Started upload ${uploadId}, file size: ${Math.round(fileSizeBytes / 1024 / 1024)} МБ`);

      const totalParts = Math.ceil(fileSizeBytes / MULTIPART_CHUNK_BYTES);
      const fd = fs.openSync(filePath, 'r');

      try {
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          const offset = (partNumber - 1) * MULTIPART_CHUNK_BYTES;
          const length = Math.min(MULTIPART_CHUNK_BYTES, fileSizeBytes - offset);
          const buffer = Buffer.alloc(length);
          fs.readSync(fd, buffer, 0, length, offset);

          const uploadResult = await this.s3.send(
            new UploadPartCommand({
              Bucket: this.bucketName,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: buffer,
              ContentLength: length,
            })
          );

          parts.push({ ETag: uploadResult.ETag!, PartNumber: partNumber });
          logger.info(`[S3 Multipart] Part ${partNumber}/${totalParts} uploaded (${Math.round(length / 1024 / 1024)} МБ)`);
        }
      } finally {
        fs.closeSync(fd);
      }

      await this.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        })
      );
      logger.info(`[S3 Multipart] ✅ Upload complete: ${key}`);
    } catch (err) {
      if (uploadId) {
        await this.s3.send(
          new AbortMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
          })
        ).catch(() => {});
        logger.error(`[S3 Multipart] ❌ Upload aborted: ${key}`);
      }
      throw err;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: '.health-check',
          Body: Buffer.from('ok'),
        })
      );
      logger.info('Beget S3 connection verified');
      return true;
    } catch (error) {
      logger.error('Beget S3 connection failed:', error);
      return false;
    }
  }
}
