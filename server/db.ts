import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// SSL включён по умолчанию (облачный Postgres, Beget). Для PostgreSQL на том же
// сервере/в Docker-сети (VPS: 172.28.0.1) задайте DATABASE_SSL=false.
const useSsl = process.env.DATABASE_SSL !== 'false';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
