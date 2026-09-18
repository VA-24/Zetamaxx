require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./middleware/logger');
const rooms = require('./ws/rooms');
const { attach } = require('./ws/server');

const port = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.get(['/', '/api'], (req, res) => res.json({ message: 'serve online' }));

const server = http.createServer(app);
const wss = attach(server);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('ZETAMAXX MONGODB CONNECTION SUCCESSFUL');
  // Schemas are the source of truth for indexes: build missing ones, drop
  // ones no longer declared (e.g. the old unique index on users.email).
  const dropped = await mongoose.syncIndexes();
  for (const [model, names] of Object.entries(dropped)) {
    if (names.length) console.log(`dropped stale ${model} indexes: ${names.join(', ')}`);
  }
  server.listen(port, () => console.log(`Server is running on port ${port}`));
}

// Finish live matches so their results are recorded, then exit. Clients
// reconnect to the replacement instance on their own.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  try {
    await rooms.endAll();
    for (const ws of wss.clients) ws.close(1001, 'server restarting');
    wss.close();
    server.close();
    await mongoose.disconnect();
  } finally {
    clearTimeout(forceExit);
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
  console.error('ZETAMAXX MONGODB CONNECTION ERROR:', err);
  process.exit(1);
});
