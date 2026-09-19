# Deploying Brainwire

Brainwire is a **static SPA** — deploy the `dist/` folder anywhere that
serves files. The recommended path is **GitHub Pages** with the included
Actions workflow (no `gh-pages` branch, no npm publish).

---

## Prerequisites

- A GitHub account.
- Node.js 22+ for local builds.
- A **public** repository (GitHub Pages on the Free plan requires a public repo).

---

## Path A: GitHub Pages (recommended)

The repo ships [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
It builds on every push to `main` and publishes `dist/` via OIDC.

### 1. Enable Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Save.

### 2. First deploy

1. Push to `main` (or run **Deploy Brainwire to GitHub Pages** manually
   from the Actions tab).
2. Wait 2–4 minutes. The live URL will be:

   ```
   https://<username>.github.io/<repo-name>/
   ```

   For the canonical repo:

   ```
   https://sakurablush.github.io/brainwire/
   ```

### 3. Branch protection (recommended)

Require the **CI** check before merging to `main` (optionally **Dependency review** when dependencies change):

**Settings → Branches → Add rule → Require status checks → `CI`**

Deploy does not re-run the full test suite — it trusts CI on `main`.

### 4. Custom domain (optional)

**Settings → Pages → Custom domain** — add DNS records GitHub shows you, then
enable **Enforce HTTPS**.

---

## Path B: Manual / other hosts

Build once, upload `dist/`:

```bash
npm ci
npm run build
```

Works on Cloudflare Pages, Netlify Drop, Surge, school web space, or a USB stick
(open `dist/index.html` in a modern browser).

| Host | Build command | Output directory |
| ---- | ------------- | ---------------- |
| Cloudflare Pages | `npm run build` | `dist` |
| Netlify | `npm run build` | `dist` |

`vite.config.ts` uses `base: './'` so relative asset paths work on any subpath.

---

## Verifying a deploy

1. Open the live URL.
2. Click **Examples → Hello, Agent** — Chat and Agent appear, connected.
3. Open **Guide** — sections load, table of contents scrolls.
4. **Privacy & keys** panel — session storage is the default.
5. DevTools → Application — workflows in IndexedDB; session keys in encrypted `sessionStorage` vault
   unless “Remember on this device” is enabled.

Force-refresh (Ctrl/Cmd+Shift+R) if you see a stale bundle after deploy.

---

## Fork workflow

```bash
git remote add upstream https://github.com/sakurablush/brainwire.git
git fetch upstream
git merge upstream/main
git push
```

Or use **Sync fork** on GitHub.

Report deploy issues with host name, URL, and build log snippet in a
[bug report issue](https://github.com/sakurablush/brainwire/issues/new/choose).
