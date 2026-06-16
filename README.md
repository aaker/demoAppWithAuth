# Horizon Debug (`demo-app-with-auth`)

A standalone **remote SDK app for NetSapiens Horizon**. It loads into the Horizon host
via Module Federation and acts as a live inspector for everything the host hands a remote
app through `horizonContext` — keys, values, function signatures, the available UI
components and templates — plus working demos of routing, extension points, API calls, and
the **remote-authentication** flow.

| | |
|---|---|
| **App id** (derived) | `demo-app-with-auth` |
| **Module Federation name** (`webpack_module`) | `demoAppWithAuth` |
| **Dev remote entry** | `http://localhost:5007/remoteEntry.js` |
| **Prod remote entry** | `https://sdk.nseng.dev/demo-app/remoteEntry.js` |
| **Mounted at** | `/apps/demo-app-with-auth` |

## What it does

Once registered and loaded, the app registers a route group under
`/apps/demo-app-with-auth` with these pages (`src/pages/`):

- **Variables** — dumps the full `horizonContext` (user, domain, theme, capabilities, …).
- **UI Elements** — renders every host-provided UI component and template.
- **API Calls** — live probes through the host's per-app API proxy against `/oauth/me`
  and `/domains/~/users/~` (`POST` and `GET`), showing request/response shapes.
- **Functions** — exercises SDK helpers like `horizonContext.navigate(...)`.
- **Events** — subscribes to and displays host events.
- **Extension Points** — registers/unregisters real dynamic routes and zone extensions
  (menu item, top-bar button, page header/footer) at runtime.
- **Remote Auth** — drives the end-to-end remote-authentication flow against a vendor
  (see [Remote authentication](#remote-authentication)).

## Repository layout

| Path | What it is |
|---|---|
| `src/App.tsx` | Entry component; registers the app's routes. |
| `src/pages/` | The inspector pages listed above. |
| `webpack.config.js` | Module Federation config — the container `name` is **`demoAppWithAuth`**. |
| `horizon-app.json` | App manifest (`id`, `permissions: ["remote-auth:request"]`). |
| `deploy` | Build + rsync `dist/` to `sdk.nseng.dev` (see [Build & deploy](#build--deploy)). |
| `mock-vendor-server/` | A local third-party vendor server for the remote-auth demo — **has its own [README](./mock-vendor-server/README.md)**. |
| `AUTH_FLOW.md` | Full remote-auth flow + security reference. |
| `auth-flow.html` / `auth-flow-walkthrough.html` | Printable and interactive versions of the flow. |

## Identifiers — keep these aligned

Three names derive from one source and **must agree**, or the app won't load / its routes
will be denied:

1. The Module Federation container **`name`** in `webpack.config.js` → **`demoAppWithAuth`**.
2. The host's registration field **`webpack_module`** → must equal that container name.
3. The app id used by the SDK (`useRemoteApp(horizonContext, '…')`) and the route paths →
   the **kebab-case** form the API derives from `webpack_module`: **`demo-app-with-auth`**
   (`id = kebab(webpack_module)`).

## Develop

```bash
npm install
npm run dev
```

Serves `remoteEntry.js` from `http://localhost:5007/remoteEntry.js` with CORS open. Ask the
Horizon admin to whitelist `localhost:5007` for local dev.

## Register with Horizon

Either via **Platform → UI SDK Management → Registered Apps → Add App**, or via the API.
The id is derived server-side from `webpack_module` (do not send one); the call returns
`202 Accepted` and persists asynchronously.

```bash
curl -X POST "https://your-horizon.example.com/ns-api/v2/ui-extensions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horizon Debug",
    "description": "Inspect the horizonContext available to remote apps",
    "version": "0.1.0",
    "webpack_module": "demoAppWithAuth",
    "remote_entry_url": "http://localhost:5007/remoteEntry.js",
    "enabled": "yes"
  }'
```

To use the **Remote Auth** page, also set the remote-auth fields on the registration
(via the admin UI or `PUT /ns-api/v2/ui-extensions/demo-app-with-auth`):

| Field | Example | Purpose |
|---|---|---|
| `remote_auth_enabled` | `"yes"` | Enables the remote-auth flow for this app. |
| `allowed_hostnames` | `"https://sdk.nseng.dev"` | Comma-separated allow-list of callback origins. |
| `remote_callback_secret` | `"test-hmac-secret"` | HMAC-SHA256 key for signing the vendor webhook (must match the vendor server). |
| `remote_timeout_seconds` | `60` | Webhook timeout. |

## Build & deploy

```bash
npm run build      # webpack --mode production → clean dist/
./deploy           # build, then rsync dist/ to sdk.nseng.dev
```

`./deploy` runs `npm run build` and rsyncs `dist/` to
`sdk.nseng.dev:/var/www/html/demo-app/` (served at
`https://sdk.nseng.dev/demo-app/`). Host, user, and path are overridable via the
`REMOTE_HOST`, `REMOTE_USER`, and `REMOTE_PATH` environment variables. After deploying,
point the registration's `remote_entry_url` at
`https://sdk.nseng.dev/demo-app/remoteEntry.js`.

## Remote authentication

The **Remote Auth** page demonstrates how a remote app obtains an access token from a
third-party vendor. The host brokers the request to ns-api v2, which mints a short-lived
authorization code (with server-side PKCE), fetches a cluster-attestation JWT from
NetSapiens Insight, and POSTs a signed webhook to the vendor. The vendor validates the
webhook (HMAC + optional RS256 cluster JWT), redeems the code, and returns its own token.

- **Full reference:** [`AUTH_FLOW.md`](./AUTH_FLOW.md) — sequence diagram, every security
  mechanism (session JWT, PKCE, HMAC, cluster-verification JWT, bearer tokens), data
  shapes, and error codes.
- **Printable / interactive:** [`auth-flow.html`](./auth-flow.html) (Print → PDF) and
  [`auth-flow-walkthrough.html`](./auth-flow-walkthrough.html) (paged, step-by-step).
- **Vendor side:** the [`mock-vendor-server/`](./mock-vendor-server/README.md) is a local
  Express server that plays the third-party vendor — it verifies the HMAC signature and the
  Insight cluster JWT, redeems the PKCE code, and issues a mock token. See its README for
  endpoints, configuration (`WEBHOOK_SECRET`, `INSIGHT_JWKS_URL`, …), and console output.
- **Hands-on test:** [`PKCE_TESTING.md`](./PKCE_TESTING.md) — the SQL to enable remote auth
  plus the click-through.

## Documentation index

| Doc | Contents |
|---|---|
| [`AUTH_FLOW.md`](./AUTH_FLOW.md) | Authoritative remote-auth flow + security reference. |
| [`auth-flow.html`](./auth-flow.html) | Single-page, print-to-PDF version of the flow. |
| [`auth-flow-walkthrough.html`](./auth-flow-walkthrough.html) | Interactive, paged step-by-step walkthrough. |
| [`mock-vendor-server/README.md`](./mock-vendor-server/README.md) | The mock vendor server — endpoints, config, troubleshooting. |
