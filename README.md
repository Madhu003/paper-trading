# Paper Trading Platform

A real-time paper trading simulator for the Indian stock market (NSE). Practice trading strategies with virtual currency backed by live market data streamed over WebSocket.

---

## Features

### Real-Time Market Data
- **Live NSE Feed** — prices for NIFTY 50 index and 20 large-cap equities fetched directly from NSE India every 10 seconds.
- **Instant WebSocket push** — on each poll cycle the backend broadcasts a `stockUpdates` event via Socket.IO; the frontend updates without a page refresh.
- **On-connect snapshot** — when a client first connects it receives the latest cached prices immediately, so there is no 10-second wait.
- **Automatic reconnection** — the frontend socket retries with exponential back-off (1 s → 10 s) and displays a live/connecting/offline status badge.

### Portfolio & P&L (Live)
- Holdings value and P&L are recomputed in the browser on every `stockUpdates` event — no extra HTTP calls needed.
- After every order settlement or deposit the backend emits `ordersChanged`; the frontend refetches portfolio, balance, orders and transactions immediately.
- Background HTTP polling (portfolio/balance every 30 s, transactions every 60 s) acts as a safety net if a socket event is missed.

### Order Lifecycle
- Orders are placed as `PENDING` and shown immediately in the UI.
- A simulated paper-trading delay of 5–10 seconds models real market latency.
- On settlement the engine executes the order atomically in PostgreSQL (balance debit/credit + portfolio upsert + transaction record), then pushes `ordersChanged` via socket.
- While any order is `PENDING` the order list polls every 2.5 seconds as an extra fallback.

### Funds Management
- Deposit virtual capital any time; balance updates via socket the moment the deposit completes.

### Charts & UI
- NIFTY 50 area chart and top-10 market-depth bar chart powered by Highcharts.
- Kite-inspired design with full light/dark mode support.
- Responsive layout built with Tailwind CSS and Radix UI primitives.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI |
| Server state | TanStack Query (React Query v5) |
| Real-time transport | Socket.IO (WebSocket) |
| Charts | Highcharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (via `pg` pool) |
| Auth | JWT (Firebase-issued tokens verified server-side) |
| Market data | `nse-india` npm package |

---

## Architecture

```
NSE India API
     │  (every 10 s)
     ▼
Backend poll worker (stockService.ts)
     │  io.emit('stockUpdates', prices)   ← also on new connection
     ▼
Socket.IO server (index.ts)
     │
     ├─ All connected clients
     │       └─ marketSocketSync.ts → queryClient.setQueryData('stocks')
     │               └─ Components recompute P&L from priceMap automatically
     │
     └─ On order settle / deposit → io.emit('ordersChanged')
             └─ marketSocketSync.ts → invalidateQueries(orders, portfolio, me, transactions)

HTTP (initial load + background fallback)
  GET /api/stocks       → query key: ['stocks']       staleTime 5 s
  GET /api/portfolio    → query key: ['portfolio']    refetch every 30 s
  GET /api/me           → query key: ['me']           refetch every 30 s
  GET /api/transactions → query key: ['transactions'] refetch every 60 s
  GET /api/orders       → query key: ['orders']       refetch every 2.5 s while PENDING
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 14+

### Database bootstrap

```bash
psql -U postgres -f db-bootstrap.sql
```

This creates the `paper_trading` database with `users`, `portfolio`, `orders`, and `transactions` tables.

### Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev            # listens on :5001
```

Required `.env` keys:

```
DATABASE_URL=postgres://user:pass@localhost:5432/paper_trading
JWT_SECRET=your-secret
PORT=5001              # optional, defaults to 5001
```

### Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev            # Vite dev server on :5173
```

Required `.env` keys:

```
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_*=...    # Firebase project config for auth
```

---

## Project Structure

```
paper-trading/
├── backend/
│   └── src/
│       ├── index.ts                 # Express + Socket.IO bootstrap
│       ├── db.ts                    # PostgreSQL pool
│       ├── middleware/auth.ts        # JWT verification
│       ├── realtime/orderFanout.ts  # notifyOrdersChanged helper
│       ├── routes/
│       │   ├── auth.ts              # sign-up / sign-in
│       │   └── orders.ts            # orders, portfolio, me, funds, transactions
│       └── services/
│           ├── stockService.ts      # NSE poll worker + in-memory cache
│           ├── priceService.ts      # price lookup helper for order engine
│           ├── orderEngine.ts       # atomic buy/sell + paper delay
│           └── nseClient.ts         # nse-india wrapper
└── frontend/
    └── src/
        ├── api/
│       │   ├── client.ts            # axios instance + auth header
│       │   ├── marketSocketSync.ts  # socket event → query cache bridge
│       │   └── queryKeys.ts         # TanStack Query key constants
        ├── hooks/
│       │   ├── useLiveStocksQuery.ts        # HTTP prefetch + socket live updates
│       │   ├── usePortfolioQuery.ts         # portfolio with 30 s background refetch
│       │   ├── useMeQuery.ts                # balance/profile with 30 s background refetch
│       │   ├── useOrdersQuery.ts            # orders with 2.5 s refetch while PENDING
│       │   ├── useTransactionsQuery.ts      # transactions with 60 s background refetch
│       │   └── useSocketConnectionStatus.ts # live/connecting/offline badge state
        ├── lib/
│       │   ├── socket.ts            # singleton Socket.IO client with auto-reconnect
│       │   └── socketConnection.ts  # external store for connection status
        ├── layouts/AppShell.tsx     # mounts useLiveStocksQuery at layout level
        └── pages/
            ├── Dashboard.tsx        # P&L cards, NIFTY chart, market watch
            ├── Holdings.tsx         # open positions with live LTP
            ├── Orders.tsx           # place orders, order history
            ├── Transactions.tsx     # full trade log
            └── Funds.tsx            # deposit virtual capital
```

---

## License

MIT
