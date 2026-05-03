# Paper Trading Platform

A high-performance, real-time paper trading simulator designed to mimic the experience of live stock market trading. This platform allows users to practice trading strategies using virtual currency with live market data.

## 🚀 Features

### 📈 Real-Time Market Data
- **Live Stock Feeds:** Continuous polling of market prices via Yahoo Finance API.
- **WebSocket Integration:** Real-time price updates pushed to the frontend using Socket.IO for a zero-latency feel.
- **NSE Market Support:** Focused on the National Stock Exchange (NSE) with support for NIFTY 50 and other major Indian indices.
- **Interactive Charts:** High-performance technical charts powered by Highcharts for visualizing price movements.

### 🛡️ Secure Trading Engine
- **Delayed Fulfillment:** Simulates real-world market liquidity by introducing a random settlement delay (5-10s) for market orders.
- **Transactional Integrity:** Uses MongoDB transactions to ensure atomic operations for balance updates, portfolio changes, and order execution.
- **Portfolio Management:** Automatic calculation of average purchase price, current value, and real-time P&L (Profit and Loss).
- **Validation:** Rigorous checks for sufficient balance, available stock quantity for selling, and valid market hours.

### 👤 User Account & Security
- **JWT Authentication:** Secure stateless authentication for all protected API endpoints.
- **Rate Limiting:** Global and per-route rate limiting to prevent API abuse.
- **Starting Balance:** New users are initialized with a virtual balance to begin trading immediately.
- **Profile Management:** View current balance, personal info, and account statistics.

### 🖥️ Modern Frontend Dashboard
- **Kite-Inspired UI:** A clean, professional trading interface inspired by industry-standard platforms like Zerodha Kite.
- **Dynamic Watchlist:** Search and track your favorite stocks with real-time price highlights.
- **Orders Management:** Track the lifecycle of your orders from 'PENDING' to 'EXECUTED' or 'REJECTED'.
- **Holdings Overview:** Detailed breakdown of current investments with total investment vs. current value analysis.
- **Funds Interface:** Manage virtual funds and view historical transaction logs.

### 🛠️ Technical Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React (Icons), TanStack Query (State Management).
- **Backend:** Node.js, Express, TypeScript, Socket.IO.
- **Database:** MongoDB (Data Persistence), Redis (Caching & Rate Limiting).
- **Styling:** Radix UI primitives for accessible components.

## 🏗️ Architecture

- **Order Fanout:** A specialized service that monitors database changes and pushes order status updates only to the relevant authenticated users.
- **Stock Poll Worker:** A background worker that fetches the latest prices every 10 seconds and broadcasts them to all connected clients.
- **Middleware Layer:** Includes custom authentication guards and Redis-backed rate limiters.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- Redis

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd paper-trading
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
