# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 15 App Router app for the `MaterialSense` materials-testing knowledge base. Core code lives in `src/`: `src/app` contains pages and API routes, `src/components` holds shared UI, and `src/lib` contains auth, database, ingestion, parsing, and RAG logic. Static assets live in `public/`, database setup files live in `db/`, and uploaded source files are stored in `uploads/`. Keep route-specific styles beside their route, for example `src/app/login/login.css`.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build.
- `npm run start`: serve the production build locally.
- `npm run lint`: run Next.js lint checks before opening a PR.
- `npm run db:up` / `npm run db:down`: start or stop PostgreSQL via Docker Compose.
- `npm run db:migrate`: apply `db` initialization SQL inside the running Postgres container.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode enabled and prefer the `@/` path alias over long relative imports. Follow the existing 2-space indentation and semicolon style in `src/**/*.ts` and `src/**/*.tsx`. Name React components in `PascalCase`, utility modules in lowercase like `src/lib/rag.ts`, and keep App Router folders lowercase to match routes. Styling is plain CSS, not Tailwind; use CSS variables and inline SVG icons as documented in `CLAUDE.md`.

## Testing Guidelines
There is no dedicated automated test suite yet. For now, treat `npm run lint` and a clean `npm run build` as the minimum gate. Manually verify `/login`, `/`, `/knowledge`, file upload flows, and streaming chat responses after API or UI changes. When adding tests later, place them beside the feature or under a top-level `tests/` directory and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Recent history follows conventional prefixes: `feat:`, `fix:`, `docs:`, and `chore:`. Keep commits focused and describe the user-visible or architectural change, for example `feat: split agent chat from knowledge base`. PRs should include a short summary, affected routes or modules, required env or database changes, and screenshots for UI work on `/login`, `/`, or `/knowledge`.

## Security & Configuration Tips
Copy `.env.local.example` to `.env.local` and set `DASHSCOPE_API_KEY`, `DATABASE_URL`, `UPLOAD_DIR`, and `JWT_SECRET`. Do not commit secrets or real uploaded documents. If you change parser or ingestion code, confirm `uploads/` handling and Postgres connectivity still work end to end.
