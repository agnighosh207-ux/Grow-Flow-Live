# 🌊 GrowFlow AI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Clerk](https://img.shields.io/badge/Clerk_Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)

**GrowFlow AI** is a premium, enterprise-grade content generation engine designed for modern creators and marketing teams. It leverages a sophisticated 8-layer AI fallback system to ensure 100% uptime and high-quality outputs across strategy, trends, and content production.

---

## ✨ Key Features

- 🧠 **8-Layer AI Engine**: Seamless failover between Groq, SambaNova, Together AI, Cerebras, OpenRouter, and Gemini.
- 🚀 **Real-time Trend Intelligence**: Integrated live-web search for generating data-backed content strategy.
- 💳 **Robust Subscription Management**: Multi-tier plan routing with Razorpay integration and atomic credit consumption.
- 🛡️ **Enterprise Security**: Timing-safe signature verification, serializable transaction locking, and comprehensive admin audit trails.
- 📊 **Advanced Analytics**: Real-time dashboard for platform monitoring, revenue tracking, and user management.

---

## 🏗️ Architecture

The project is managed as a monorepo with high modularity:

```text
├── 🌍 backend/          # Node.js/Express API with secure middleware architecture
├── 🎨 frontend/         # React SPA built with Vite and Tailwind CSS
└── 📦 lib/
    ├── 🗄️ db/           # Shared Drizzle ORM schemas and database migrations
    ├── 📝 api-zod/      # Centralized Zod validation schemas
    └── 🔌 api-client/   # Auto-generated React hooks for backend communication
```

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- [PostgreSQL](https://www.postgresql.org/)

### Local Development

1. **Clone & Install**:
   ```bash
   git clone <repository-url>
   cd Grow-Flow-Live
   pnpm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your API keys for Clerk, Razorpay, and your chosen AI providers.

3. **Run Services**:
   ```bash
   pnpm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

---

## 🔒 Security Compliance

GrowFlow AI is built with a security-first mindset:
- **Transaction Atomicity**: Prevents race conditions in credit usage using `FOR UPDATE` row locking.
- **Audit Logging**: All sensitive administrative actions (like user impersonation) are logged and timestamped.
- **CSRF & CORS**: Hardened Cross-Origin Resource Sharing policies for production safety.
- **Encryption**: Secure handling of payment identifiers and authentication tokens.

---

## 🚢 Deployment

Optimized for **Railway** deployment using Nixpacks. Auto-deployment is triggered on every push to the `main` branch.

```bash
pnpm run build   # Verifies types and compiles all packages
pnpm run start   # Starts the production bundle
```

---

## 📄 License

Copyright © 2026 GrowFlow AI. All rights reserved.
