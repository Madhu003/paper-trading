import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectMongo } from './db';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import { startStockUpdates, getCachedPrices } from './services/stockService';
import { attachOrderFanout } from './realtime/orderFanout';
import { startupLog } from './startupLog';
import './loadEnv';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

startupLog('http: boot — creating Express, HTTP server, Socket.IO');

// Real-time order status fanout
attachOrderFanout(io);

app.use(cors());
app.use(express.json());

// Routes
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

app.get('/api/stocks', (req, res) => {
  const prices = getCachedPrices();
  res.json(prices);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

startupLog('http: starting stock poll worker (first NSE fetch runs immediately, then every 10s)');
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
