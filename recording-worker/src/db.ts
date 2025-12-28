import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import AWS from 'aws-sdk';
import * as schema from '../../shared/schema';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// S3 Storage (Beget)
export const s3 = new AWS.S3({
  endpoint: process.env.BEGET_S3_ENDPOINT,
  accessKeyId: process.env.BEGET_S3_ACCESS_KEY,
  secretAccessKey: process.env.BEGET_S3_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

export const BUCKET_NAME = process.env.BEGET_S3_BUCKET || 'recordings';

export async function checkConnections() {
  try {
    // Check DB
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    // Check S3
    await s3.listBuckets().promise();
    console.log('✅ S3 Storage connected');
    
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}