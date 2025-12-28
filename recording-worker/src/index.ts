import express from 'express';
import dotenv from 'dotenv';
import { checkConnections, db } from './db';
import { recordingTasks } from '../../shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import { Recorder } from './recorder';
import { uploadToS3 } from './uploader';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const WORKER_ID = process.env.WORKER_ID || 'worker-vps-01';

app.use(express.json());

const API_SECRET = process.env.API_SECRET || 'fallback-secret-replace-me';

// Middleware for auth
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

let currentTask: string | null = null;
const recorder = new Recorder();

// Heartbeat & Polling
async function updateHeartbeat() {
  if (currentTask) {
    try {
      await db.update(recordingTasks)
        .set({ lastHeartbeat: new Date() })
        .where(eq(recordingTasks.id, currentTask));
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }
}

async function pollTasks() {
  if (currentTask) return;

  try {
    const now = new Date();
    const [task] = await db.select()
      .from(recordingTasks)
      .where(and(
        eq(recordingTasks.status, 'ready'),
        lte(recordingTasks.scheduledTime, new Date(now.getTime() + 1 * 60 * 1000))
      ))
      .limit(1);

    if (task) {
      console.log(`Polling found task: ${task.id}`);
      // В реальном сценарии лучше делать POST на самого себя или вызывать функцию напрямую
      // Для простоты вызовем логику обработки здесь
      startTaskInternal(task.id);
    }
  } catch (error) {
    console.error('Polling error:', error);
  }
}

async function startTaskInternal(taskId: string) {
  if (currentTask) return;
  
  try {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task) return;

    currentTask = taskId;
    const fileName = `${taskId}.mp4`;
    const outputPath = path.join(process.cwd(), 'recordings', fileName);

    if (!fs.existsSync('recordings')) fs.mkdirSync('recordings');

    console.log(`Starting task ${taskId}`);
    await db.update(recordingTasks)
      .set({ status: 'in_progress', workerId: WORKER_ID, startedAt: new Date() })
      .where(eq(recordingTasks.id, taskId));

    await recorder.start(task.streamUrl, task.duration, outputPath);
    
    const begetUrl = await uploadToS3(outputPath, fileName);
    
    await db.update(recordingTasks)
      .set({ status: 'completed', begetUrl, completedAt: new Date() })
      .where(eq(recordingTasks.id, taskId));

    currentTask = null;
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error('Task execution error:', error);
    currentTask = null;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', workerId: WORKER_ID, currentTask });
});

app.post('/task/start', authenticate, async (req, res) => {
  const { taskId } = req.body;
  if (currentTask) return res.status(400).json({ error: 'Worker busy' });
  startTaskInternal(taskId);
  res.json({ message: 'Task start initiated', taskId });
});

async function start() {
  const isConnected = await checkConnections();
  if (!isConnected) {
    console.error('Failed to connect to storage/database. Exiting...');
    process.exit(1);
  }

  // Intervals
  setInterval(updateHeartbeat, 30 * 1000); // Heartbeat every 30s
  setInterval(pollTasks, 60 * 1000); // Poll every 1m

  app.listen(port, () => {
    console.log(`Recording Worker ${WORKER_ID} listening at http://localhost:${port}`);
  });
}

start();