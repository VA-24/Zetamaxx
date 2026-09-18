# Zetamaxx

Zetamac, but multiplayer. Next.js frontend, Node backend, MongoDB.

## Architecture

```
browser ──HTTP /api/*──▶ Next.js (Vercel) ──rewrite──▶ backend /api/*   auth, profile, leaderboard, singleplayer results
browser ──WebSocket /ws────────────────────────────────▶ backend         rooms, matchmaking, live scores
                                                          │
                                                          └──▶ MongoDB   users + completed-match records
```

The backend is one persistent Node process (`backend/index.js`). Express serves
the stateless REST endpoints; a `ws` server on the same port handles everything
about a live match:

- **Rooms** (`backend/ws/rooms.js`) live in memory and are authoritative. The
  server owns the seed, generates the problem list, validates every answer,
  runs the clock and ends the match exactly once. Clients only send answers
  and receive pushed state; nothing is polled.
- **Matchmaking** (`backend/ws/matchmaking.js`) is an in-memory queue. Rating
  window starts at ±100 and widens by 100 every 10s. Disconnecting removes you.
- **Persistence** happens once per match: one read (both players) and two
  parallel writes (ELO + result for both users in a `bulkWrite`, plus one
  `Match` record). Zero database traffic during play.
- **Frontend** talks to the socket through `frontend/src/lib/socket.js`, a
  single connection per tab that authenticates with the stored JWT, reconnects
  with backoff, and re-issues each page's intent (join room / sit in queue) after
  a reconnect. Refreshing mid-match resumes from the server's snapshot.

Protocol reference is at the top of `backend/ws/server.js`.

## Local development

```sh
# MongoDB (any instance works; this uses Docker)
docker run -d --name zetamaxx-mongo -p 27017:27017 mongo:7

cd backend
cp .env.example .env         # set MONGODB_URI, JWT_SECRET
npm install && npm run dev   # http://localhost:3001

cd ../frontend
cp .env.example .env.local   # defaults point at localhost:3001
npm install && npm run dev   # http://localhost:3000
```

`MATCH_DURATION=10 npm run dev` in `backend/` shortens matches for testing.

## Deployment

The backend holds WebSocket connections and in-memory rooms, so it needs a
long-running host, not serverless functions. It is set up for Render; the
frontend stays on Vercel.

### Backend → Render

`render.yaml` at the repo root is a Render Blueprint. In the Render dashboard:
**New → Blueprint → pick this repo**, then supply the two prompted secrets:

- `MONGODB_URI` – the existing Atlas connection string. Same URI = same data
  (the current database is named `test`, the driver default when the URI has no
  path). Existing users, ratings and results carry over unchanged.
- `JWT_SECRET` – `node backend/jwt_token_generation.js` prints a fresh one

On boot the server syncs indexes with the schemas; the first deploy logs
`dropped stale User indexes: email_1` because accounts no longer use email. No
data is removed — old documents simply keep an ignored `email` field.

The service listens on Render's `PORT`, health-checks `/api`, and on deploy
`SIGTERM` finishes any live matches (results are saved) before the old
instance exits; clients reconnect to the new one.

Note the free plan sleeps after 15 minutes idle, so the first connection after
a quiet spell takes ~30–60s while it wakes. Any paid plan avoids that.

### Frontend → Vercel

Set two environment variables on the Vercel project (Settings → Environment
Variables), then redeploy:

| Variable             | Value                                        |
| -------------------- | -------------------------------------------- |
| `BACKEND_URL`        | `https://zetamaxx-server.onrender.com`       |
| `NEXT_PUBLIC_WS_URL` | `wss://zetamaxx-server.onrender.com/ws`      |

`BACKEND_URL` is read at build time by `next.config.mjs` for the `/api` rewrite;
`NEXT_PUBLIC_WS_URL` is baked into the client bundle.

### Cutover order

1. Deploy the backend on Render and confirm `https://<host>/api` returns `{"message":"serve online"}`.
2. Set the two Vercel variables and redeploy the frontend.
3. Delete the old `zetamaxx-server` Vercel project.

Existing JWTs stay valid across the cutover as long as `JWT_SECRET` is
unchanged. The previous secret and database password were committed to git
history, so rotate both (users just log in again).
