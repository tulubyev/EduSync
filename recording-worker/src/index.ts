import express from 'express';
import dotenv from 'dotenv';
import { checkConnections, db } from './db';
import { recordingTasks } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Recorder } from './recorder';
import { uploadToS3 } from './uploader';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const WORKER_ID = process.env.WORKER_ID || 'worker-vps-01';

app.use(express.json());

let currentTask: string | null = null;
const recorder = new Recorder();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', workerId: WORKER_ID, currentTask });
});

app.post('/task/start', async (req, res) => {
  const { taskId } = req.body;
  if (currentTask) return res.status(400).json({ error: 'Worker busy' });

  try {
    const [task] = await db.select().from(recordingTasks).where(eq(recordingTasks.id, taskId));
    if (!task) return res.status(404).json({ error: 'Task not found' });

    currentTask = taskId;
    const fileName = `${taskId}.mp4`;
    const outputPath = path.join(process.cwd(), 'recordings', fileName);

    if (!fs.existsSync('recordings')) fs.mkdirSync('recordings');

    res.json({ message: 'Task started', taskId });

    // Start recording in background
    await recorder.start(task.streamUrl, task.duration, outputPath);
    
    // Upload when finished
    const begetUrl = await uploadToS3(outputPath, fileName);
    
    // Update DB
    await db.update(recordingTasks)
      .set({ 
        status: 'completed', 
        begetUrl,
        completedAt: new Date()
      })
      .where(eq(recordingTasks.id, taskId));

    currentTask = null;
    fs.unlinkSync(outputPath); // Clean up local file
  } catch (error) {
    console.error('Task error:', error);
    currentTask = null;
    res.status(500).json({ error: 'Failed to process task' });
  }
});

async function start() {
  const isConnected = await checkConnections();
  if (!isConnected) {
    console.error('Failed to connect to storage/database. Exiting...');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Recording Worker ${WORKER_ID} listening at http://localhost:${port}`);
  });
}

start();