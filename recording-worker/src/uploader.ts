import { BUCKET_NAME, s3 } from './db';
import fs from 'fs';
import path from 'path';

export async function uploadToS3(filePath: string, fileName: string) {
  const fileStream = fs.createReadStream(filePath);
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: fileStream,
    ContentType: 'video/mp4',
    ACL: 'public-read',
  };

  const upload = await s3.upload(params).promise();
  console.log(`Uploaded to S3: ${upload.Location}`);
  return upload.Location;
}