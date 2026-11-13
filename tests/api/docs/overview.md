# api-tests

The app's vitest suite (the home page under the site's name, HEAD /, /health and its environment, Nitro's own 404, the site's name), the app built by Nitro itself with the node-listener preset, served on Node and called over HTTP, run with pnpm test

The test suite for **api**. It deploys nothing: its lane installs, builds and runs the tests.

|              |                      |
| ------------ | -------------------- |
| Type         | `turbo-package`      |
| Source       | `tests/api`          |
| Package      | `@app/api-tests`     |
| Environments | `dev`: `quick-check` |

## Depends on

- (none)

## Depended on by

- (none)
