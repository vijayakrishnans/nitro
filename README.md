# nitro

A [Nitro](https://nitro.build/) server on one **Cloudflare Worker**. Nitro's
`cloudflare_module` preset builds the app's file-based routes
(`apps/api/server/routes/`) into the Worker, and any static file under
`apps/api/server/public/` into Workers Static Assets, served before the
Worker runs. Every merge to `main` deploys it to stage, then prod.

Built from Vercel's Nitro starter (vercel/examples, MIT — the licence is
`apps/api/LICENSE.md`).

## Live deployment

<!-- 02-docs:begin -->
This app is **live**. Verified URLs, identity and the secrets it uses are
recorded in [ai/context/deployment.md](ai/context/deployment.md) (re-rendered
by the `02-docs` phase); how it deploys and how to operate it:
[ai/context/operations.md](ai/context/operations.md).
<!-- 02-docs:end -->

## Routes

| Route | Answers |
|---|---|
| `GET /` | the welcome page, titled with the site's name (`SITE_NAME`) |
| `GET /health` | `{"status":"ok","name":"<SITE_NAME>","environment":"<env>"}` — what the deploy's smoke and an operator's probe read |
| anything else | Nitro's `404`, as JSON (`{"statusCode":404,"statusMessage":"Cannot find any route matching …"}`) |

## What is here

| Surface | Where |
|---|---|
| The routes, one file each | `apps/api/server/routes/` (`index.ts`, `health.ts`) |
| The site's name (the welcome page's title and heading, and `/health`) | `apps/api/server/identity.ts` |
| Nitro's config (`srcDir`, the `cloudflare_module` preset) | `apps/api/nitro.config.ts` |
| Worker config (name, compatibility date, the build output as the Worker and its Static Assets, per-environment vars) | `apps/api/wrangler.jsonc` |
| Deploy contract | `apps/api/component.yaml` (`cloudflare-worker-turbo`) |
| Tests | `tests/api` (vitest: builds the app with Nitro's `node-listener` preset, serves it on Node and calls every route over HTTP) |

## Getting started

```bash
pnpm install          # also runs `nitro prepare` (the types under apps/api/.nitro)
pnpm typecheck
pnpm lint
pnpm test
pnpm build            # nitro build → apps/api/.output (the Worker and its assets)
```

Run it with Nitro's dev server, or the built Worker under workerd, and call it:

```bash
pnpm --filter @app/api dev                 # nitro dev, http://localhost:3000
pnpm --filter @app/api preview             # wrangler dev over the build, http://localhost:8787
curl http://localhost:8787/                # the welcome page
curl http://localhost:8787/health          # {"status":"ok",…,"environment":"local"}
```

Add a route by adding a file under `apps/api/server/routes/` that exports
`defineEventHandler(...)`: `hello.ts` answers `/hello`, `users/[id].ts`
answers `/users/42` (read the id with `getRouterParam(event, "id")`);
`apps/api/server/api/` is mounted under `/api`. Keep `/health`: the deploy's
smoke reads it. Static files go in `apps/api/server/public/`.

On the Worker, a request's bindings and vars are `event.context.cloudflare.env`
(as `/health` reads `ENVIRONMENT`); Nitro's `useStorage()` keeps data in the
Worker's memory unless you mount a driver (Workers KV, say) in
`nitro.config.ts`, so do not rely on it across requests.

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. The app deploys to `stage`, then to
`prod` once stage has converged on the same commit; `dev` only verifies. The
Worker is `nitro-api-<env>` on your account's workers.dev subdomain, and
every deploy is smoke-tested over HTTP: `/health` must answer `"status":"ok"`
for that environment. A pull request runs the same pipeline's verify lanes:
the Worker built, type-checked and dry-deployed for each environment, with
nothing deployed. They do not lint or run the tests, so run `pnpm typecheck`,
`pnpm lint` and `pnpm test` before you push. (A push to `main` builds,
deploys and smoke-tests.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The
Cloudflare token and account id are brokered per run from the workspace's
Cloudflare connection; nothing provider-shaped is stored in the repository
or in GitHub.

**Deploy by hand.** Orunbase's **Deploy** button on a component, or **Run
workflow** on the CI workflow in GitHub's Actions tab (on `main`), runs
`ci.yml` for the environment and components you pick, and each one deploys
exactly as a merge would deploy it. Leave the component blank to redeploy
every component in that environment, with nothing changed: after rotating a
secret, say. A component with nothing to run in that environment (a test
suite in `prod`) is left out with a notice.

## Adding a binding or a secret

The Worker binds nothing of its own today (`ASSETS` is its build output),
so `wrangler.jsonc` is committed as it deploys. To give it a KV namespace, a D1 database or an R2 bucket, add the
resource under `infra/` as its own component and have `apps/api/component.yaml`
depend on it; `tooling/wire/` renders a wrangler template from the ids that
component publishes. A runtime secret (an API key for a service the app
calls) is an Orun secret: `orun secrets set <KEY> --org <ws> --env <env>`,
declared in the component's `optionalSecretEnv` and named in its
`runtimeSecrets`, then pushed to the Worker after each deploy. Until it is
set, the route that needs it should say so rather than fail. On the Worker
a secret is in `event.context.cloudflare.env`, beside the vars.

## Custom domain

The app answers on workers.dev from its first deploy. To serve it on your own
domain, add the domain to the Cloudflare account the app deploys into and
attach it to the Worker (dashboard → Workers & Pages → `nitro-api-prod` →
Settings → Domains & Routes → Add → Custom domain); do the same for stage
with a subdomain if you want one. The workers.dev URL keeps answering, and the
deploy's smoke keeps reading it — unless the environment sets `DEPLOYED_URL`
in `intent.yaml`, which the smoke reads instead:

```yaml
environments:
  prod:
    env:
      DEPLOYED_URL: https://nitro.example.com
```

The repository names the domain in one place, `BASE_DOMAIN` in `intent.yaml`
(one line per environment), which the app was born with as the reserved
placeholder `nitro.example.com` — the example above carries it too.
Replace it with your domain in the same change that attaches it.
