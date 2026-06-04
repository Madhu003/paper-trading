# 🚀 Paper Trading Backend

A robust Node.js and Express backend service that powers the Paper Trading Platform. It handles real-time data fetching, order execution, and portfolio management.

## 🛠️ Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express with TypeScript
- **Database:** MongoDB (for persistence)
- **Real-time:** Socket.IO for WebSocket communication
- **Auth:** JSON Web Tokens (JWT)
- **Data Source:** NSE India (via `stock-nse-india`)

## 🔑 Core Services

### 📊 Stock Service
- Periodically polls NSE India for the latest stock and index prices.
- Implements an optimized batch-fetching strategy to handle multiple symbols efficiently.
- Uses an in-memory cache to serve data with minimal latency.
- Broadcasts updates to all connected clients via WebSockets.

### ⚙️ Order Engine
- Manages the lifecycle of market orders.
- Simulates realistic market conditions with random settlement delays (5-10s).
- Ensures transactional integrity using MongoDB Sessions/Transactions for all trade-related operations.
- Automatically handles portfolio updates (average price, quantity) and balance deductions.

### 🛡️ Auth & Middleware
- Secure JWT-based authentication for all private routes.
- Centralized environment variable management.
- Robust error handling and startup logging.

## 📡 API Endpoints

- `POST /api/auth/signup` - Register a new user.
- `POST /api/auth/signin` - Authenticate and receive a JWT.
- `GET /api/stocks` - Get latest market quotes (cached).
- `POST /api/orders` - Place a new market order (Buy/Sell).
- `GET /api/orders` - List user order history.
- `GET /api/portfolio` - Get user holdings and P&L.
- `GET /api/transactions` - Detailed activity log.
- `POST /api/funds/deposit` - Add virtual capital.

## 🚀 Getting Started

1. `npm install`
2. `cp .env.example .env` (Set your `MONGODB_URI` and `JWT_SECRET`)
3. `npm run dev`
