import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { logError, logInfo } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let connected = false;
let dbMode = 'none'; // 'mongo' | 'memory' | 'none'

export function isMongoConnected() {
  return connected && mongoose.connection.readyState === 1;
}

export function getDbMode() {
  return dbMode;
}

export async function connectDb() {
  if (env.mongodbUri) {
    try {
      await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 4000 });
      connected = true;
      dbMode = 'mongo';
      attachConnectionEvents();
      logInfo('Connected to MongoDB');
      return true;
    } catch {
      connected = false;
      dbMode = 'none';
      logError('MongoDB connection failed');
      if (!env.demoMode) return false;
    }
  }

  if (env.demoMode) {
    return connectMemory();
  }

  return false;
}

async function connectMemory() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  // Persist demo data across `node --watch` restarts so OTPs/sessions don't vanish.
  const dbPath = path.resolve(__dirname, '../../../.data/demo-mongo');
  fs.mkdirSync(dbPath, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'paybot_demo',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  await mongoose.connect(mongod.getUri());
  connected = true;
  dbMode = 'memory';
  attachConnectionEvents();
  logInfo(
    'Using durable demo MongoDB (no local MongoDB). Data lives in .data/demo-mongo and survives API restarts.',
  );
  return true;
}

function attachConnectionEvents() {
  mongoose.connection.on('disconnected', () => {
    connected = false;
  });
  mongoose.connection.on('connected', () => {
    connected = true;
  });
}
