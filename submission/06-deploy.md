# Deploying to Pxxl

The backend is a plain Node service with no dependencies and no build step, so a Pxxl Web Service deploy is a configuration job rather than a port.

## What the service needs

From `package.json`, the start command is `npm start`, which runs `node server/index.mjs`.

- `PORT`: read from the environment, falling back to `4173`.
- `HOST`: when `PORT` is present the server binds `0.0.0.0`, which is what Pxxl's health check requires. When `PORT` is absent it binds `127.0.0.1` for local use. Setting `HOST=0.0.0.0` explicitly as well removes any doubt.
- Static assets are served from `web/`, so `GET /` returns `web/app.html`.
- The service writes its audit log to `.runtime/workflow.jsonl` and creates that directory on first run.

## Deploy steps

1. Sign in to `pxxl.app`, open the dashboard and choose **Deploy**.
2. Choose **GitHub** as the source and install the Pxxl GitHub App with access to `muffishim/lookthrough`.
3. Select the repository and branch `main`.
4. In the configuration review, check these values:
   - Project type: **Web Service**
   - Language: **Node.js**
   - Start command: `npm start`
   - Port: `4173`
   - Build command: none required. The package declares no dependencies.
5. Add the environment variable `HOST` with value `0.0.0.0`.
6. Submit and follow the build log. The route is published once the health check passes.

## Environment variables for Canton mode

Without credentials the deployed service runs exactly like the local one, and the header reads **Local simulation**. To make it talk to a Canton participant, add these to the project's environment variables:

```
CANTON_JSON_API_URL
CANTON_OIDC_TOKEN_URL
CANTON_OIDC_CLIENT_ID
CANTON_OIDC_CLIENT_SECRET
CANTON_OIDC_USERNAME
CANTON_OIDC_PASSWORD
CANTON_ACCESS_TOKEN          # use this instead of the OIDC variables if you have a bearer token
CANTON_GP_PARTY
CANTON_REVIEWER_PARTY
CANTON_AUDITOR_PARTY
CANTON_STANDARD_LP_PARTY
CANTON_ENHANCED_LP_PARTY
```

`.env.example` has the two URLs already filled in for the shared Season 3 participant. The app reads `process.env` directly, so Pxxl's variable store is picked up without any file changes. Redeploy after changing a variable, because running containers do not reload them.

**Order matters.** The deployed service looks up an existing `Fund` contract on the participant. Run `npm run devnet:execute` once from a machine that has the credentials, against the same participant, to create the fund and both positions. After that the deployed service finds those contracts and every action it takes lands on them.

## Connecting your domain

Open **Dashboard > Domains**, add the domain, and follow the verification and routing steps. Pxxl provisions SSL for the routed hostname. Point the domain at the Lookthrough project rather than the prototype.

## Two things to know before you publish it

**There is no authentication.** The role picker in the sidebar is a demonstration identity switcher, and the app says so on screen. Anyone who can reach the URL can act as the fund manager. Pxxl has a **Password Protection** setting per project; turn it on before sharing the link widely.

**The audit log is per container.** `.runtime/workflow.jsonl` lives inside the deployed container, so a redeploy or restart reseeds the workspace to its starting state. The Canton ledger does not reset, which is why the local record and the participant can drift if you redeploy mid-demo. For a recorded demo, run it against a freshly seeded state as described in `02-demo-script.md`.

## What the deployed header will show

- **Local simulation** until the Canton variables are set and the participant is reachable.
- **Canton DevNet connected** once they are, at which point valuations, disclosure decisions and redemption requests submit to the participant before the local audit log records them.
