/**
 * L0 prerequisite: durable local MongoDB on 27017 without Docker/MSI.
 * Uses mongodb-memory-server's mongod binary with a fixed port + WiredTiger path.
 * Keep this process running while developing live mode.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const dbPath = path.join(root, '.data', 'mongo');
const port = Number(process.env.PAYBOT_MONGO_PORT || 27017);
const dbName = process.env.PAYBOT_MONGO_DB || 'paybot';

fs.mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: {
    port,
    dbName,
    dbPath,
    storageEngine: 'wiredTiger',
  },
});

const uri = mongod.getUri(dbName);
console.log(`[paybot] Local MongoDB ready`);
console.log(`[paybot] URI: ${uri}`);
console.log(`[paybot] Data: ${dbPath}`);
console.log(`[paybot] Keep this terminal open. Set MONGODB_URI=mongodb://127.0.0.1:${port}/${dbName}`);

const shutdown = async () => {
  console.log('\n[paybot] Stopping local MongoDB...');
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Stay alive
await new Promise(() => {});
