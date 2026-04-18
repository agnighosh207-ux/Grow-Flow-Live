# GrowFlow AI

> AI-powered content generation SaaS for creators.

Turn one idea into scroll-stopping content for Instagram, YouTube Shorts, Twitter/X, and LinkedIn — in under 60 seconds.

---

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Framer Motion
- **Backend**: Express 5 + TypeScript (Node.js 20+)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk
- **AI**: Groq (Llama 3) & Cerebras
- **Payments**: Razorpay
- **Monorepo**: pnpm workspaces

---

## Getting Started

### 1. Install dependencies

\`\`\`bash
pnpm install
\`\`\`

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your values in `.env`:
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com/keys)
- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` — from [dashboard.clerk.com](https://dashboard.clerk.com)
- `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` — from [dashboard.razorpay.com](https://dashboard.razorpay.com)

### 3. Push database schema

\`\`\`bash
pnpm db:push
\`\`\`

### 4. Run in development

\`\`\`bash
pnpm dev:api        # API server on :3000
pnpm dev:frontend   # Frontend on :5173
\`\`\`

---

## Project Structure

\`\`\`
├── backend/                 # Express backend
├── frontend/                # React frontend
├── sandbox/                 # Standalone environment for UI mockups
├── lib/
│   ├── db/                  # Drizzle ORM schema + client
│   ├── api-zod/             # Zod validation schemas
│   ├── api-client-react/    # Generated API hooks
│   ├── api-spec/            # OpenAPI spec
│   └── integrations-openai-ai-server/  # AI integration service
└── scripts/                 # Utility scripts
\`\`\`

---

## Subscription Plans

| Plan | Price | Generations |
|------|-------|-------------|
| Explorer | Free | 3 lifetime trials |
| Spark | ₹99/mo | 15/month |
| Creator | ₹249/mo | 50/month |
| Infinity | ₹399/mo | Unlimited |

---

## Key Commands

\`\`\`bash
pnpm build         # Full typecheck + build
pnpm db:push       # Push DB schema changes
pnpm typecheck     # Run TypeScript checks
\`\`\`

---

## Contact

growflowaihelp@gmail.com
