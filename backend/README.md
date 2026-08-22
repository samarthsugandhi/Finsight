# Finsight Backend

Express + TypeScript + Prisma (MySQL) API implementing the Core tier of the Finsight synopsis,
in a layered architecture: routes → controllers → services → database.

## Setup

```bash
npm install
cp .env.example .env          # edit DATABASE_URL and JWT secrets
npx prisma generate            # generates the typed Prisma client — do this before anything else
npx prisma migrate dev --name init   # creates tables in your MySQL database
npm run db:seed                # seeds default income/expense categories
npm run dev                    # http://localhost:5001
```

### If you hit "the url argument must be of type string" or similar crash

That means `.env` is missing or `DATABASE_URL` isn't set — you skipped `cp .env.example .env`.
This version fails with a **clear** error message instead (`src/config/env.ts` validates all
env vars at boot with Zod), so if you see a wall of red instead of a friendly message, you're
running the old build — pull this version.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with tsx (auto-restart on save) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting files |
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Create/apply a migration after schema changes |
| `npm run db:seed` | Seed default categories |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Project structure

```
prisma/schema.prisma        Data model (source of truth for the DB schema)
src/
├── app.ts                   Express app: middleware + route mounting
├── server.ts                 Entry point
├── config/env.ts             Zod-validated environment variables
├── database/prisma.ts        Prisma client singleton
├── types/express.d.ts        Adds req.userId to Express's Request type
├── middlewares/
│   ├── auth.middleware.ts      requireAuth — JWT verification
│   ├── validate.middleware.ts  Runs Zod schemas against req.body/query
│   ├── error.middleware.ts     AppError class + centralized error handling
│   └── rateLimiters.ts         Auth + general API rate limits
├── validators/                Zod schemas — one file per resource
├── services/                  Business logic, talks to Prisma directly
├── controllers/                Thin HTTP layer — parse request, call service, respond
└── routes/                     One file per resource, wires validators + controllers
scripts/seed.ts               Seeds default categories
```

**Why this layering:** controllers never touch Prisma directly — they call a service, which
owns all database access and business rules. This keeps route handlers thin and makes the
business logic (e.g. the health score calculation, budget upsert logic) unit-testable
independent of Express.

## API reference

Same as before — see the route files in `src/routes/` for the exact list. All routes under
`/api` except `/auth/signup` and `/auth/login` require `Authorization: Bearer <accessToken>`.

## Financial Health Score

`src/utils/healthScore.ts` — pure function, fully typed, unchanged formula from the synopsis:

| Component | Weight |
|---|---|
| Savings Rate | 30% |
| Budget Discipline | 20% |
| Investment Diversification | 20% |
| Emergency Fund Coverage | 20% |
| Debt Ratio | 10% |

Debt Ratio currently defaults to 0 (no Loan/Debt model yet) — same caveat as before, worth
deciding as a team whether that's Round 1 or Round 2.

## On verification — please read before Round 1 demo day

I could not run `npx prisma generate` in the environment I built this in (it needs to download
engine binaries from a domain my sandbox blocks — same limitation as before, unrelated to your
machine). This means:

- **Type-checked, not runtime-tested this time.** `npm run typecheck` currently shows ~22 errors,
  and every single one traces back to the same root cause: the Prisma client hasn't been
  generated in this environment, so its types don't exist yet, which cascades into "implicit
  any" errors on anything touching query results. This is expected and will fully resolve the
  moment you run `npx prisma generate` — I verified there are zero *unrelated* errors underneath.
- **Please run this checklist yourself before you rely on it for a demo:**
  1. `npm install && npx prisma generate` — confirm it completes without error
  2. `npm run typecheck` — should show **zero** errors once step 1 is done
  3. `npx prisma migrate dev` against a real MySQL database — confirm tables are created
  4. `npm run db:seed && npm run dev` — confirm the server boots
  5. Run through signup → login → add a transaction → check `/api/health-score` — either via
     curl/Postman or through the frontend

If anything in that checklist fails, paste me the exact error and I'll fix it — but I'd rather
tell you plainly what I could and couldn't verify than claim more confidence than I actually have.
