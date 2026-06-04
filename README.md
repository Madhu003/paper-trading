# 📈 Paper Trading Platform

A high-fidelity, real-time paper trading simulator designed for the Indian stock market (NSE). This platform enables users to practice trading strategies with virtual currency using live, real-time market data.

## 🚀 Key Features

### ⚡ Real-Time Market Integration
- **Live NSE Feed:** Direct integration with NSE India for real-time stock and index quotes (NIFTY 50).
- **Batch Processing:** Optimized background polling worker that fetches data in intelligent batches to ensure freshness.
- **WebSocket Streaming:** Instant price updates pushed to the frontend via Socket.IO for a zero-latency trading experience.
- **Interactive Technical Charts:** High-performance charts powered by Highcharts for deep price analysis.

### 💼 Professional Trading Experience
- **Quick Trade Modal:** Instant Buy/Sell interface with quantity selection, real-time value calculation, and affordability checks.
- **Delayed Order Fulfillment:** Simulates real-world market liquidity and execution latency (5-10s delay).
- **Portfolio Analytics:** Real-time P&L tracking, average cost calculation, and visual portfolio allocation breakdown.
- **Market News Feed:** Integrated live news highlights to keep you informed of market-moving events.

### 📋 Activity & Tracking
- **Comprehensive Activity Log:** Detailed transaction history tracking every buy, sell, and fund movement.
- **Order Lifecycle:** Track orders from 'PENDING' to 'EXECUTED' or 'REJECTED' with detailed status messages.
- **Funds Management:** Easily add virtual capital to your account to increase your buying power.

### 🌗 Modern UI/UX
- **Atomic Design Architecture:** Built with a highly maintainable and scalable component structure (Atoms, Molecules, Organisms).
- **Dual Theme Support:** Full support for Light and Dark modes with a professional, Kite-inspired aesthetic.
- **Responsive Layout:** Seamless experience across desktop and mobile devices.

## 🛠️ Technical Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons, Sonner (Toasts).
- **Backend:** Node.js, Express, TypeScript, Socket.IO, MongoDB (Aggregation & Transactions).
- **State Management:** Server-state synchronization with TanStack Query and real-time Socket.IO events.

## 🏗️ Architecture

The platform is designed with simplicity and reliability in mind:
- **Simplified Backend:** Infrastructure-light setup using in-memory caching for real-time data, removing external dependencies like Redis for easier deployment.
- **Transactional Integrity:** Uses MongoDB transactions to ensure that trades, balance updates, and portfolio changes are always atomic.
- **Component-Driven UI:** Leveraging an atomic design system for consistent styling and rapid feature development.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd paper-trading
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env # Update with your MONGODB_URI
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
This project is licensed under the MIT License.
