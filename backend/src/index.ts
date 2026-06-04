import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectPg } from './db';
import authRoutes from './routes/auth';
import ordersRoutes from './routes/orders';
import { startStockUpdates, getCachedPrices } from './services/stockService';
import { getMarketNews } from './services/newsService';
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

app.get('/api/news', async (req, res) => {
  try {
    const news = await getMarketNews();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

// 1. Bind the port immediately so Render's health check passes
server.listen(PORT, '0.0.0.0', () => {
  startupLog('http: listening', { PORT, url: `http://0.0.0.0:${PORT}` });
});

// 2. Connect to PostgreSQL in the background
startupLog('http: calling connectPg() in background');
connectPg()
  .then((pool) => {
    startupLog('http: Postgres ready', { PORT });
  })
  .catch((err) => {
    startupLog('http: abort — Postgres connection failed', {
      name: err instanceof Error ? err.name : 'Error',
      message: err instanceof Error ? err.message : String(err),
    });
    console.error('Postgres connection failed:', err);
    // Do not process.exit(1) immediately to allow inspection of logs, or let the orchestrator handle it.
  });

