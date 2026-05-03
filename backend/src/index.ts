import './loadEnv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import { connectMongo } from './db';
import { startStockUpdates, getStockPrices } from './services/stockService';
import { ensureRedisConnected, redis } from './redis';
import { rateLimit } from './middleware/rateLimit';
import { startupLog } from './startupLog';
import { attachOrderFanout } from './realtime/orderFanout';

startupLog('http: boot — creating Express, HTTP server, Socket.IO');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
attachOrderFanout(io);

app.use(cors());
app.use(express.json());

// Routes
app.use(
  rateLimit({
    keyPrefix: 'rate:global',
    windowSec: 60,
    max: 300,
  })
);
app.use('/api/auth', authRoutes);
app.use('/api', ordersRoutes);
startupLog('http: routes registered', {
  auth: '/api/auth',
  orders: '/api',
  stocks: 'GET /api/stocks',
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/api/stocks', async (req, res) => {
  try {
    await ensureRedisConnected();
    const cached = await redis.get('prices:latest');
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } catch {
    // ignore; fallback to live fetch
  }

  const prices = await getStockPrices();
  res.json(prices);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

startupLog('http: starting stock poll worker (first Yahoo fetch runs immediately, then every 10s)');
startStockUpdates(io);

const PORT = process.env.PORT || 5001;
startupLog('http: calling connectMongo() — server.listen runs only after success', { PORT });

connectMongo()
  .then((db) => {
    startupLog('http: Mongo ready, binding listener', { database: db.databaseName, PORT });
    server.listen(PORT, () => {
      startupLog('http: listening', { PORT, url: `http://localhost:${PORT}` });
    });
  })
  .catch((err) => {
    startupLog('http: abort — Mongo connection failed', {
      name: err instanceof Error ? err.name : 'Error',
      message: err instanceof Error ? err.message : String(err),
    });
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
