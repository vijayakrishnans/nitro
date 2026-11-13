# api — architecture

Built by the turbo pipeline from `apps/api` and deployed with wrangler.

|                     |                              |
| ------------------- | ---------------------------- |
| Worker config       | `apps/api/wrangler.jsonc`    |
| Entry               | `./.output/server/index.mjs` |
| Compatibility date  | `2026-10-01`                 |
| Compatibility flags | `nodejs_compat`              |

## Bindings

| Binding  | Kind          | Source             |
| -------- | ------------- | ------------------ |
| `ASSETS` | Static assets | `./.output/public` |

## Variables

`ENVIRONMENT` — overridden per environment (`dev`, `prod`, `stage`).
