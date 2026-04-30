# GrowFlow AI

AI-powered content generation platform for creators and marketers.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **Auth**: Clerk
- **Payments**: Razorpay
- **AI**: Multi-provider fallback (Groq, SambaNova, Together AI, Cerebras, OpenRouter, Gemini)

## Project Structure

```
├── backend/          # Express API server
├── frontend/         # React SPA (Vite)
├── lib/
│   ├── db/           # Drizzle schema + database connection
│   ├── api-zod/      # Shared Zod schemas
│   ├── api-client-react/  # React API hooks
│   └── integrations-openai-ai-server/  # AI client
├── scripts/          # Utility scripts
└── nixpacks.toml     # Railway deploy config
```

## Development

```bash
pnpm install
pnpm run dev          # Starts both frontend (5173) and backend (3000)
```

## Deployment

Deployed via Railway with auto-deploy from `main` branch.

```bash
pnpm run build        # Typecheck + build all packages
pnpm run start        # Start production server
```

## Environment Variables

See `.env.example` for required configuration.
