# Steps to clone template

1. Create folder for your project and cd into it

2. Perform the following commands in the command line
```bash
git clone https://github.com/SEB-13-Bahrain/jwt-auth-template-backend.git .
rm -rf .git
rm README.md
```

3. Create a .env file with the following values:
```
MONGODB_URI=your-connection-string
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=super-secret-key-no-one-would-guess
```


4. run:
```bash
npm i
```


5. run:
```bash
npm run dev
```



## Optional

3. Create a .env.test file with the following values:
```
MONGODB_URI=your-connection-string
```
**IMPORTANT**: DO NOT USE THE SAME DATABASE AS IN YOUR `.env` file. Add `-test` to the end of the database name

## Deployment (Render)

This backend is deployed on Render (`https://al-duniya-back.onrender.com`) from
GitHub (`faisalr305/al-duniya-back`, branch `main`; Render auto-deploys on push).

Set these in **Render Dashboard → your service → Environment** (they are NOT
committed — `.env` is gitignored):

```
MONGODB_URI=your-reachable-connection-string
CLIENT_URL=https://al-duniya-appointment.netlify.app
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=a-different-long-random-secret
NODE_ENV=production
```

`JWT_REFRESH_SECRET` signs the HTTP-only renewal cookie. It must be different
from `JWT_SECRET`, remain stable across deployments, and never be committed.
Users stay signed in through automatic token renewal for 30 days by default.
Set `REFRESH_TOKEN_TTL_DAYS` or `ACCESS_TOKEN_TTL` only if you need different
session durations.

- `MONGODB_URI` **must be reachable from the internet** — `mongodb://localhost:...`
  or `127.0.0.1` will never work on Render. Use a cloud database such as
  MongoDB Atlas (free tier): create a cluster, add a Database User, and allow
  network access from anywhere (`0.0.0.0/0`).
- Also set the same `MONGODB_URI` as a **GitHub repository secret** named
  `MONGODB_URI` so the CI workflow (`npm test`) passes.

Once `MONGODB_URI` is set, Render restarts the service and the API connects.

Diagnostics:
- `GET /api/health` → `{"status":"ok","database":"connected"}` when healthy,
  or `{"status":"error","database":"disconnected"}` when Mongo is not reachable.
- If `MONGODB_URI` is missing, the server logs a clear warning on startup and
  data endpoints fail fast (no more "buffering timed out" hangs).
