import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { logger } from '../../logger';
import { executorConfig } from './config';

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
      const fileContent = fs.readFileSync(filePath);
      const now = new Date();
      const key = `myepa/recordings/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileName}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileContent,
          ContentType: fileName.endsWith('.mp4') ? 'video/mp4' : 'video/webm',
        })
      );

      const publicUrl = `${this.publicUrl}/${key}`;
      logger.info(`Uploaded to Beget: ${publicUrl}`);

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
