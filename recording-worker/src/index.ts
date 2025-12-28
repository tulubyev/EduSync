import express from 'express';
import dotenv from 'dotenv';
import { checkConnections } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  const isConnected = await checkConnections();
  if (!isConnected) {
    console.error('Failed to connect to storage/database. Exiting...');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Recording Worker listening at http://localhost:${port}`);
  });
}

start();