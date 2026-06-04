# 🖥️ Paper Trading Frontend

A modern, high-performance React application that provides a professional trading experience. Built with a focus on real-time data visualization and intuitive user workflows.

## ✨ Highlights

- **Atomic Design System:** Components are organized into Atoms, Molecules, and Organisms for maximum reusability and clarity.
- **Real-time Updates:** Seamless integration with Socket.IO for live price streaming and order status updates.
- **Dual Theme Support:** Custom-built light and dark modes with HSL variable-based theming.
- **Responsive Analytics:** Professional-grade charts using Highcharts for market trends and portfolio breakdown.

## 🛠️ Tech Stack

- **Framework:** React 19 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Data Fetching:** TanStack Query (v5)
- **UI Components:** Custom atomic components (Kite-inspired)
- **Notifications:** Sonner (Toast system)

## 📁 Folder Structure

- `src/components/atoms` - Basic UI elements (Button, Badge, Input, etc.)
- `src/components/molecules` - Combined elements (ThemeToggle, TradeModal)
- `src/components/organisms` - Complex UI sections (KiteHeader, MarketWatch)
- `src/pages` - High-level page components (Dashboard, Holdings, etc.)
- `src/hooks` - Custom React hooks for data and socket management
- `src/lib` - Utility functions for formatting and calculations

## 🚀 Getting Started

1. `npm install`
2. `cp .env.example .env` (Set your `VITE_API_URL`)
3. `npm run dev`
